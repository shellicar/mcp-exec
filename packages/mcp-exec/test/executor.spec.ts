import { describe, expect, it } from 'vitest';
import { execute } from '../src/execute';
import type { Command, ExecInput } from '../src/types';

function input(commands: [Command, ...Command[]], chaining: ExecInput['chaining'] = 'bail_on_error'): ExecInput {
  return {
    description: 'test',
    commands,
    chaining,
    background: false,
    stripAnsi: true,
  };
}

/** Helper: single command */
function cmd(program: string, args: string[] = [], extra?: Partial<Command>): Command {
  return { program, args, merge_stderr: false, ...extra };
}

describe('executor', () => {
  describe('single command execution', () => {
    it('executes echo and captures stdout', async () => {
      const result = await execute(input([cmd('echo', ['hello'])]), '/tmp');
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.stdout.trim()).toBe('hello');
      expect(result.results[0]?.exitCode).toBe(0);
    });

    it('captures stderr', async () => {
      const result = await execute(input([cmd('cat', ['/tmp/nonexistent-file-xyz-12345'])]), '/tmp');
      expect(result.success).toBe(false);
      expect(result.results[0]?.stderr).toBeTruthy();
      expect(result.results[0]?.exitCode).not.toBe(0);
    });
  });

  describe('command with stdin', () => {
    it('pipes stdin content to the command', async () => {
      const result = await execute(input([cmd('cat', [], { stdin: 'hello from stdin' })]), '/tmp');
      expect(result.success).toBe(true);
      expect(result.results[0]?.stdout.trim()).toBe('hello from stdin');
    });
  });

  describe('pipeline execution', () => {
    it('pipes stdout of first command to stdin of second', async () => {
      const result = await execute(input([cmd('echo', ['hello world']), cmd('wc', ['-w'])]), '/tmp');
      expect(result.success).toBe(true);
      expect(result.results[0]?.stdout.trim()).toBe('2');
    });

    it('supports multi-stage pipelines', async () => {
      const result = await execute(
        input([cmd('echo', ['banana\napple\ncherry']), cmd('sort'), cmd('head', ['-1'])]),
        '/tmp',
      );
      expect(result.success).toBe(true);
      expect(result.results[0]?.stdout.trim()).toBe('apple');
    });
  });

  describe('merge_stderr', () => {
    it('pipes stderr into next command stdin when merge_stderr is true', async () => {
      const result = await execute(
        input([cmd('node', ['-e', 'process.stderr.write("from-stderr")'], { merge_stderr: true }), cmd('cat')]),
        '/tmp',
      );
      expect(result.results[0]?.stdout.trim()).toBe('from-stderr');
    });

    it('does not pipe stderr to next command when merge_stderr is false', async () => {
      const result = await execute(
        input([cmd('node', ['-e', 'process.stderr.write("from-stderr")']), cmd('cat')]),
        '/tmp',
      );
      expect(result.results[0]?.stdout.trim()).toBe('');
      expect(result.results[0]?.stderr).toContain('from-stderr');
    });

    it('merge_stderr on last command has no effect', async () => {
      const result = await execute(input([cmd('echo', ['hello']), cmd('cat', [], { merge_stderr: true })]), '/tmp');
      expect(result.results[0]?.stdout.trim()).toBe('hello');
    });

    it('merges stderr into stdout for a single command', async () => {
      const result = await execute(
        input([
          cmd('node', ['-e', 'process.stdout.write("out"); process.stderr.write("err")'], { merge_stderr: true }),
        ]),
        '/tmp',
      );
      expect(result.success).toBe(true);
      expect(result.results[0]?.stdout).toContain('out');
      expect(result.results[0]?.stdout).toContain('err');
      expect(result.results[0]?.stderr).toBe('');
    });

    it('keeps stderr separate for a single command when merge_stderr is false', async () => {
      const result = await execute(
        input([cmd('node', ['-e', 'process.stdout.write("out"); process.stderr.write("err")'])]),
        '/tmp',
      );
      expect(result.success).toBe(true);
      expect(result.results[0]?.stdout).toContain('out');
      expect(result.results[0]?.stdout).not.toContain('err');
      expect(result.results[0]?.stderr).toContain('err');
    });
  });

  describe('working directory not found', () => {
    it('returns exit 126 for non-existent cwd on command', async () => {
      const result = await execute(input([cmd('echo', ['hello'], { cwd: '/tmp/nonexistent-cwd-xyz-99999' })]), '/tmp');
      expect(result.success).toBe(false);
      expect(result.results[0]?.exitCode).toBe(126);
      expect(result.results[0]?.stderr).toContain('Working directory not found');
      expect(result.results[0]?.stderr).toContain('/tmp/nonexistent-cwd-xyz-99999');
    });

    it('returns exit 126 for non-existent default cwd on command', async () => {
      const result = await execute(input([cmd('echo', ['hello'])]), '/tmp/nonexistent-default-cwd-xyz-99999');
      expect(result.success).toBe(false);
      expect(result.results[0]?.exitCode).toBe(126);
      expect(result.results[0]?.stderr).toContain('Working directory not found');
    });

    it('returns exit 126 for non-existent cwd on pipeline', async () => {
      const result = await execute(
        input([cmd('echo', ['hello']), cmd('cat')]),
        '/tmp/nonexistent-pipeline-cwd-xyz-99999',
      );
      expect(result.success).toBe(false);
      expect(result.results[0]?.exitCode).toBe(126);
      expect(result.results[0]?.stderr).toContain('Working directory not found');
    });

    it('still returns exit 127 for non-existent program', async () => {
      const result = await execute(input([cmd('nonexistent_program_xyz_12345')]), '/tmp');
      expect(result.success).toBe(false);
      expect(result.results[0]?.exitCode).toBe(127);
      expect(result.results[0]?.stderr).toContain('Command not found');
    });
  });

  describe('exit code propagation', () => {
    it('propagates exit code from the command', async () => {
      const result = await execute(input([cmd('bash', ['-c', 'exit 42'])]), '/tmp');
      expect(result.success).toBe(false);
      expect(result.results[0]?.exitCode).toBe(42);
    });

    it('reports exit code 0 for successful commands', async () => {
      const result = await execute(input([cmd('true')]), '/tmp');
      expect(result.success).toBe(true);
      expect(result.results[0]?.exitCode).toBe(0);
    });
  });
});
