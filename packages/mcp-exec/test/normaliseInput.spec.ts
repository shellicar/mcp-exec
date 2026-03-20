import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { normaliseInput } from '../src/normaliseInput';
import type { ExecInput } from '../src/types';

function makeInput(steps: ExecInput['steps']): ExecInput {
  return { description: 'test', steps, chaining: 'bail_on_error', background: false, stripAnsi: true };
}

describe('normaliseInput', () => {
  describe('program expansion', () => {
    it('expands ~ in program', () => {
      const result = normaliseInput(
        makeInput([{ type: 'command', program: '~/bin/foo', args: [], merge_stderr: false }]),
      );
      const step = result.steps[0];
      expect(step?.type === 'command' && step.program).toBe(`${homedir()}/bin/foo`);
    });

    it('expands $HOME in program', () => {
      const result = normaliseInput(
        makeInput([{ type: 'command', program: '$HOME/bin/foo', args: [], merge_stderr: false }]),
      );
      const step = result.steps[0];
      expect(step?.type === 'command' && step.program).toBe(`${process.env['HOME']}/bin/foo`);
    });
  });

  describe('cwd expansion', () => {
    it('expands ~ in cwd', () => {
      const result = normaliseInput(
        makeInput([{ type: 'command', program: 'echo', args: [], merge_stderr: false, cwd: '~/projects' }]),
      );
      const step = result.steps[0];
      expect(step?.type === 'command' && step.cwd).toBe(`${homedir()}/projects`);
    });

    it('leaves cwd undefined when not set', () => {
      const result = normaliseInput(makeInput([{ type: 'command', program: 'echo', args: [], merge_stderr: false }]));
      const step = result.steps[0];
      expect(step?.type === 'command' && step.cwd).toBeUndefined();
    });
  });

  describe('redirect.path expansion', () => {
    it('expands ~ in redirect.path', () => {
      const result = normaliseInput(
        makeInput([
          {
            type: 'command',
            program: 'echo',
            args: [],
            merge_stderr: false,
            redirect: { path: '~/output.txt', stream: 'stdout' as const, append: false },
          },
        ]),
      );
      const step = result.steps[0];
      expect(step?.type === 'command' && step.redirect?.path).toBe(`${homedir()}/output.txt`);
    });
  });

  describe('args are NOT expanded', () => {
    it('does not expand ~ in args', () => {
      const result = normaliseInput(
        makeInput([{ type: 'command', program: 'echo', args: ['~/file.txt'], merge_stderr: false }]),
      );
      const step = result.steps[0];
      expect(step?.type === 'command' && step.args[0]).toBe('~/file.txt');
    });

    it('does not expand $HOME in args', () => {
      const result = normaliseInput(
        makeInput([{ type: 'command', program: 'echo', args: ['$HOME/file.txt'], merge_stderr: false }]),
      );
      const step = result.steps[0];
      expect(step?.type === 'command' && step.args[0]).toBe('$HOME/file.txt');
    });
  });

  describe('pipeline commands', () => {
    it('expands program and cwd in pipeline commands', () => {
      const result = normaliseInput(
        makeInput([
          {
            type: 'pipeline',
            commands: [
              { program: '~/bin/grep', args: ['-r', 'TODO'], merge_stderr: false, cwd: '~/src' },
              { program: 'wc', args: ['-l'], merge_stderr: false },
            ],
          },
        ]),
      );
      const step = result.steps[0];
      if (step?.type === 'pipeline') {
        expect(step.commands[0]?.program).toBe(`${homedir()}/bin/grep`);
        expect(step.commands[0]?.cwd).toBe(`${homedir()}/src`);
        expect(step.commands[1]?.program).toBe('wc');
      }
    });

    it('does not expand args in pipeline commands', () => {
      const result = normaliseInput(
        makeInput([
          {
            type: 'pipeline',
            commands: [
              { program: 'grep', args: ['-r', '$HOME'], merge_stderr: false },
              { program: 'wc', args: ['-l'], merge_stderr: false },
            ],
          },
        ]),
      );
      const step = result.steps[0];
      if (step?.type === 'pipeline') {
        expect(step.commands[0]?.args[1]).toBe('$HOME');
      }
    });
  });
});
