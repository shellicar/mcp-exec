import { homedir } from 'node:os';

/** Expand ~ and $VAR / ${VAR} in a path string. */
export function expandPath(value: string): string {
  return value
    .replace(/^~(?=\/|$)/, homedir())
    .replace(/\$\{(\w+)\}|\$(\w+)/g, (_, braced: string, bare: string) => process.env[braced ?? bare] ?? '');
}
