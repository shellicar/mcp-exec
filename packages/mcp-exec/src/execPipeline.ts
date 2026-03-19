import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import type { Command, StepResult } from './types';

/** Execute a pipeline of commands with stdout→stdin piping. */
export async function execPipeline(commands: Command[], cwd: string, timeoutMs?: number): Promise<StepResult> {
  if (commands.length === 0) {
    return { stdout: '', stderr: '', exitCode: 0, signal: null };
  }

  return new Promise((resolve) => {
    const children = commands.map((cmd, i) => {
      const child = spawn(cmd.program, cmd.args ?? [], {
        cwd: cmd.cwd ?? cwd,
        env: cmd.env ? { ...process.env, ...cmd.env } : process.env,
        stdio: 'pipe',
        timeout: timeoutMs,
      });

      if (i === 0 && cmd.stdin !== undefined) {
        child.stdin.write(cmd.stdin);
        child.stdin.end();
      } else if (i === 0) {
        child.stdin.end();
      }

      return child;
    });

    // Connect pipes: stdout of each → stdin of next
    for (let i = 0; i < children.length - 1; i++) {
      const curr = children[i];
      const next = children[i + 1];
      if (curr !== undefined && next !== undefined) {
        curr.stdout.pipe(next.stdin);
      }
    }

    const lastChild = children[children.length - 1];
    const lastCmd = commands[commands.length - 1];
    if (lastChild === undefined || lastCmd === undefined) {
      resolve({ stdout: '', stderr: '', exitCode: 0, signal: null });
      return;
    }

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    lastChild.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));

    for (const child of children) {
      child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    }

    if (lastCmd.redirect) {
      const flags = lastCmd.redirect.append ? 'a' : 'w';
      const stream = createWriteStream(lastCmd.redirect.path, { flags });
      const target = lastCmd.redirect.stream;
      if (target === 'stdout' || target === 'both') {
        lastChild.stdout.pipe(stream);
      }
      if (target === 'stderr' || target === 'both') {
        lastChild.stderr.pipe(stream);
      }
    }

    lastChild.on('close', (code, signal) => {
      resolve({
        stdout: Buffer.concat(stdout).toString('utf-8'),
        stderr: Buffer.concat(stderr).toString('utf-8'),
        exitCode: code,
        signal: signal ?? null,
      });
    });

    lastChild.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        resolve({
          stdout: '',
          stderr: `Command not found: ${lastCmd.program}`,
          exitCode: 127,
          signal: null,
        });
      } else {
        resolve({
          stdout: '',
          stderr: err.message,
          exitCode: 1,
          signal: null,
        });
      }
    });
  });
}
