import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { expandPath } from './expandPath';
import type { Command, StepResult } from './types';

/** Execute a single command via child_process.spawn (no shell). */
export function execCommand(cmd: Command, cwd: string, timeoutMs?: number): Promise<StepResult> {
  return new Promise((resolve) => {
    const env = { ...process.env, ...cmd.env } satisfies NodeJS.ProcessEnv;
    const child = spawn(expandPath(cmd.program), cmd.args ?? [], {
      cwd: expandPath(cmd.cwd ?? cwd),
      env,
      stdio: 'pipe',
      timeout: timeoutMs,
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

    if (cmd.stdin !== undefined) {
      child.stdin.write(cmd.stdin);
      child.stdin.end();
    } else {
      child.stdin.end();
    }

    if (cmd.redirect) {
      const flags = cmd.redirect.append ? 'a' : 'w';
      const stream = createWriteStream(cmd.redirect.path, { flags });
      const target = cmd.redirect.stream;
      if (target === 'stdout' || target === 'both') {
        child.stdout.pipe(stream);
      }
      if (target === 'stderr' || target === 'both') {
        child.stderr.pipe(stream);
      }
    }

    child.on('close', (code, signal) => {
      resolve({
        stdout: Buffer.concat(stdout).toString('utf-8'),
        stderr: Buffer.concat(stderr).toString('utf-8'),
        exitCode: code,
        signal: signal ?? null,
      });
    });

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        resolve({
          stdout: '',
          stderr: `Command not found: ${cmd.program}`,
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
