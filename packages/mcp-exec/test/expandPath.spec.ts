import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { expandPath } from '../src/expandPath';

describe('expandPath', () => {
  describe('tilde expansion', () => {
    it('expands ~ to home directory', () => {
      expect(expandPath('~')).toBe(homedir());
    });

    it('expands ~/path', () => {
      expect(expandPath('~/projects')).toBe(`${homedir()}/projects`);
    });

    it('does not expand ~ in the middle of a string', () => {
      expect(expandPath('/foo/~/bar')).toBe('/foo/~/bar');
    });

    it('does not expand ~username', () => {
      expect(expandPath('~root/bin')).toBe('~root/bin');
    });
  });

  describe('env var expansion', () => {
    it('expands $VAR', () => {
      process.env['TEST_EXPAND_VAR'] = '/test/value';
      expect(expandPath('$TEST_EXPAND_VAR')).toBe('/test/value');
      process.env['TEST_EXPAND_VAR'] = undefined;
    });

    it('expands ${VAR}', () => {
      process.env['TEST_EXPAND_VAR'] = '/test/value';
      expect(expandPath('${TEST_EXPAND_VAR}/sub')).toBe('/test/value/sub');
      process.env['TEST_EXPAND_VAR'] = undefined;
    });

    it('expands $HOME', () => {
      expect(expandPath('$HOME')).toBe(process.env['HOME']);
    });

    it('expands ${HOME}', () => {
      expect(expandPath('${HOME}/foo')).toBe(`${process.env['HOME']}/foo`);
    });

    it('expands multiple vars in one string', () => {
      process.env['TEST_A'] = 'foo';
      process.env['TEST_B'] = 'bar';
      expect(expandPath('$TEST_A/$TEST_B')).toBe('foo/bar');
      process.env['TEST_A'] = undefined;
      process.env['TEST_B'] = undefined;
    });

    it('replaces undefined var with empty string', () => {
      expect(expandPath('$THIS_VAR_DOES_NOT_EXIST_XYZ')).toBe('');
    });
  });

  describe('plain paths', () => {
    it('returns absolute paths unchanged', () => {
      expect(expandPath('/usr/local/bin')).toBe('/usr/local/bin');
    });

    it('returns plain program names unchanged', () => {
      expect(expandPath('git')).toBe('git');
    });
  });
});
