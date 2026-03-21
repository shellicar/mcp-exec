import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { normaliseInput } from '../src/normaliseInput';
import type { Command, ExecInput } from '../src/types';

function makeInput(steps: { commands: Command[] }[]): ExecInput {
  return {
    description: 'test',
    steps,
    chaining: 'bail_on_error',
    background: false,
    stripAnsi: true,
  };
}

function cmd(program: string, args: string[] = [], extra?: Partial<Command>): Command {
  return { program, args, merge_stderr: false, ...extra };
}

describe('normaliseInput', () => {
  describe('program expansion', () => {
    it('expands ~ in program', () => {
      const result = normaliseInput(makeInput([{ commands: [cmd('~/bin/foo')] }]));
      expect(result.steps[0]?.commands[0]?.program).toBe(`${homedir()}/bin/foo`);
    });

    it('expands $HOME in program', () => {
      const result = normaliseInput(makeInput([{ commands: [cmd('$HOME/bin/foo')] }]));
      expect(result.steps[0]?.commands[0]?.program).toBe(`${process.env['HOME']}/bin/foo`);
    });
  });

  describe('cwd expansion', () => {
    it('expands ~ in cwd', () => {
      const result = normaliseInput(makeInput([{ commands: [cmd('echo', [], { cwd: '~/projects' })] }]));
      expect(result.steps[0]?.commands[0]?.cwd).toBe(`${homedir()}/projects`);
    });

    it('leaves cwd undefined when not set', () => {
      const result = normaliseInput(makeInput([{ commands: [cmd('echo')] }]));
      expect(result.steps[0]?.commands[0]?.cwd).toBeUndefined();
    });
  });

  describe('redirect.path expansion', () => {
    it('expands ~ in redirect.path', () => {
      const result = normaliseInput(
        makeInput([
          {
            commands: [
              cmd('echo', [], { redirect: { path: '~/output.txt', stream: 'stdout' as const, append: false } }),
            ],
          },
        ]),
      );
      expect(result.steps[0]?.commands[0]?.redirect?.path).toBe(`${homedir()}/output.txt`);
    });
  });

  describe('args are NOT expanded', () => {
    it('does not expand ~ in args', () => {
      const result = normaliseInput(makeInput([{ commands: [cmd('echo', ['~/file.txt'])] }]));
      expect(result.steps[0]?.commands[0]?.args[0]).toBe('~/file.txt');
    });

    it('does not expand $HOME in args', () => {
      const result = normaliseInput(makeInput([{ commands: [cmd('echo', ['$HOME/file.txt'])] }]));
      expect(result.steps[0]?.commands[0]?.args[0]).toBe('$HOME/file.txt');
    });
  });

  describe('pipeline commands', () => {
    it('expands program and cwd in pipeline commands', () => {
      const result = normaliseInput(
        makeInput([{ commands: [cmd('~/bin/grep', ['-r', 'TODO'], { cwd: '~/src' }), cmd('wc', ['-l'])] }]),
      );
      expect(result.steps[0]?.commands[0]?.program).toBe(`${homedir()}/bin/grep`);
      expect(result.steps[0]?.commands[0]?.cwd).toBe(`${homedir()}/src`);
      expect(result.steps[0]?.commands[1]?.program).toBe('wc');
    });

    it('does not expand args in pipeline commands', () => {
      const result = normaliseInput(makeInput([{ commands: [cmd('grep', ['-r', '$HOME']), cmd('wc', ['-l'])] }]));
      expect(result.steps[0]?.commands[0]?.args[1]).toBe('$HOME');
    });
  });
});
