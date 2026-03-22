import { homedir } from 'node:os';

/** Expand ~ and $VAR / ${VAR} in a path string. */
export function expandPath(value: string): string;
export function expandPath(value: string | undefined): string | undefined;
export function expandPath(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }
  return value
    .replace(/^~(?=\/|$)/, homedir())
    .replace(/\$\{(\w+)\}|\$(\w+)/g, (_, braced: string, bare: string) => process.env[braced ?? bare] ?? '');
}
