import { describe, expect, it } from 'vitest';
import { execute } from '../src/execute';
import type { ExecInput, Step } from '../src/types';

function input(steps: Step[], chaining: ExecInput['chaining'] = 'bail_on_error'): ExecInput {
  return {
    description: 'test',
    steps,
    chaining,
    background: false,
    stripAnsi: true,
  };
}

/** Helper: single command step */
function cmd(program: string, args: string[] = [], extra?: Partial<Step & { type: 'command' }>): Step {
  return { type: 'command', program, args, merge_stderr: false, ...extra };
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
      const step: Step = {
        type: 'command',
        program: 'cat',
        args: [],
        merge_stderr: false,
        stdin: 'hello from stdin',
      };
      const result = await execute(input([step]), '/tmp');
      expect(result.success).toBe(true);
      expect(result.results[0]?.stdout.trim()).toBe('hello from stdin');
    });
  });

  describe('pipeline execution', () => {
    it('pipes stdout of first command to stdin of second', async () => {
      const step: Step = {
        type: 'pipeline',
        commands: [
          { program: 'echo', args: ['hello world'], merge_stderr: false },
          { program: 'wc', args: ['-w'], merge_stderr: false },
        ],
      };
      const result = await execute(input([step]), '/tmp');
      expect(result.success).toBe(true);
      expect(result.results[0]?.stdout.trim()).toBe('2');
    });

    it('supports multi-stage pipelines', async () => {
      const step: Step = {
        type: 'pipeline',
        commands: [
          { program: 'echo', args: ['banana\napple\ncherry'], merge_stderr: false },
          { program: 'sort', args: [], merge_stderr: false },
          { program: 'head', args: ['-1'], merge_stderr: false },
        ],
      };
      const result = await execute(input([step]), '/tmp');
      expect(result.success).toBe(true);
      expect(result.results[0]?.stdout.trim()).toBe('apple');
    });
  });

  describe('bail_on_error chaining', () => {
    it('stops on first failure', async () => {
      const steps: Step[] = [cmd('false'), cmd('echo', ['should not run'])];
      const result = await execute(input(steps, 'bail_on_error'), '/tmp');
      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.exitCode).not.toBe(0);
    });

    it('runs all steps when all succeed', async () => {
      const steps: Step[] = [cmd('true'), cmd('echo', ['ran'])];
      const result = await execute(input(steps, 'bail_on_error'), '/tmp');
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('sequential chaining', () => {
    it('runs all steps regardless of failure', async () => {
      const steps: Step[] = [cmd('false'), cmd('echo', ['should run'])];
      const result = await execute(input(steps, 'sequential'), '/tmp');
      expect(result.results).toHaveLength(2);
      expect(result.success).toBe(false);
      expect(result.results[1]?.stdout.trim()).toBe('should run');
      expect(result.results[1]?.exitCode).toBe(0);
    });
  });

  describe('merge_stderr', () => {
    it('pipes stderr into next command stdin when merge_stderr is true', async () => {
      const step: Step = {
        type: 'pipeline',
        commands: [
          { program: 'node', args: ['-e', 'process.stderr.write("from-stderr")'], merge_stderr: true },
          { program: 'cat', args: [], merge_stderr: false },
        ],
      };
      const result = await execute(input([step]), '/tmp');
      expect(result.results[0]?.stdout.trim()).toBe('from-stderr');
    });

    it('does not pipe stderr to next command when merge_stderr is false', async () => {
      const step: Step = {
        type: 'pipeline',
        commands: [
          { program: 'node', args: ['-e', 'process.stderr.write("from-stderr")'], merge_stderr: false },
          { program: 'cat', args: [], merge_stderr: false },
        ],
      };
      const result = await execute(input([step]), '/tmp');
      expect(result.results[0]?.stdout.trim()).toBe('');
      expect(result.results[0]?.stderr).toContain('from-stderr');
    });

    it('merge_stderr on last command has no effect', async () => {
      const step: Step = {
        type: 'pipeline',
        commands: [
          { program: 'echo', args: ['hello'], merge_stderr: false },
          { program: 'cat', args: [], merge_stderr: true },
        ],
      };
      const result = await execute(input([step]), '/tmp');
      expect(result.results[0]?.stdout.trim()).toBe('hello');
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
      const step: Step = {
        type: 'pipeline',
        commands: [
          { program: 'echo', args: ['hello'], merge_stderr: false },
          { program: 'cat', args: [], merge_stderr: false },
        ],
      };
      const result = await execute(input([step]), '/tmp/nonexistent-pipeline-cwd-xyz-99999');
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

    it('applies expandPath before cwd check', async () => {
      const result = await execute(input([cmd('echo', ['hello'], { cwd: '$HOME' })]), '/tmp');
      expect(result.success).toBe(true);
      expect(result.results[0]?.exitCode).toBe(0);
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
