import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { normaliseInput } from '../src/normaliseInput';
import type { Command, ExecInput } from '../src/types';

function makeInput(commands: [Command, ...Command[]]): ExecInput {
  return {
    description: 'test',
    commands,
    chaining: 'bail_on_error',
    background: false,
    stripAnsi: true,
  };
}

describe('normaliseInput', () => {
  describe('program expansion', () => {
    it('expands ~ in program', () => {
      const result = normaliseInput(makeInput([{ program: '~/bin/foo', args: [], merge_stderr: false }]));
      expect(result.commands[0]?.program).toBe(`${homedir()}/bin/foo`);
    });

    it('expands $HOME in program', () => {
      const result = normaliseInput(makeInput([{ program: '$HOME/bin/foo', args: [], merge_stderr: false }]));
      expect(result.commands[0]?.program).toBe(`${process.env['HOME']}/bin/foo`);
    });
  });

  describe('cwd expansion', () => {
    it('expands ~ in cwd', () => {
      const result = normaliseInput(makeInput([{ program: 'echo', args: [], merge_stderr: false, cwd: '~/projects' }]));
      expect(result.commands[0]?.cwd).toBe(`${homedir()}/projects`);
    });

    it('leaves cwd undefined when not set', () => {
      const result = normaliseInput(makeInput([{ program: 'echo', args: [], merge_stderr: false }]));
      expect(result.commands[0]?.cwd).toBeUndefined();
    });
  });

  describe('redirect.path expansion', () => {
    it('expands ~ in redirect.path', () => {
      const result = normaliseInput(
        makeInput([
          {
            program: 'echo',
            args: [],
            merge_stderr: false,
            redirect: { path: '~/output.txt', stream: 'stdout' as const, append: false },
          },
        ]),
      );
      expect(result.commands[0]?.redirect?.path).toBe(`${homedir()}/output.txt`);
    });
  });

  describe('args are NOT expanded', () => {
    it('does not expand ~ in args', () => {
      const result = normaliseInput(makeInput([{ program: 'echo', args: ['~/file.txt'], merge_stderr: false }]));
      expect(result.commands[0]?.args[0]).toBe('~/file.txt');
    });

    it('does not expand $HOME in args', () => {
      const result = normaliseInput(makeInput([{ program: 'echo', args: ['$HOME/file.txt'], merge_stderr: false }]));
      expect(result.commands[0]?.args[0]).toBe('$HOME/file.txt');
    });
  });

  describe('pipeline commands', () => {
    it('expands program and cwd in pipeline commands', () => {
      const result = normaliseInput(
        makeInput([
          { program: '~/bin/grep', args: ['-r', 'TODO'], merge_stderr: false, cwd: '~/src' },
          { program: 'wc', args: ['-l'], merge_stderr: false },
        ]),
      );
      expect(result.commands[0]?.program).toBe(`${homedir()}/bin/grep`);
      expect(result.commands[0]?.cwd).toBe(`${homedir()}/src`);
      expect(result.commands[1]?.program).toBe('wc');
    });

    it('does not expand args in pipeline commands', () => {
      const result = normaliseInput(
        makeInput([
          { program: 'grep', args: ['-r', '$HOME'], merge_stderr: false },
          { program: 'wc', args: ['-l'], merge_stderr: false },
        ]),
      );
      expect(result.commands[0]?.args[1]).toBe('$HOME');
    });
  });
});
