import { expandPath } from './expandPath';
import type { Command, ExecInput } from './types';

/** Expand ~ and $VAR in path-like fields (program, cwd, redirect.path) before validation and execution. */
export function normaliseInput(input: ExecInput): ExecInput {
  return {
    ...input,
    steps: input.steps.map((step) => ({
      ...step,
      commands: step.commands.map(normaliseCommand),
    })),
  };
}

function normaliseCommand(cmd: Command): Command {
  return {
    ...cmd,
    program: expandPath(cmd.program),
    cwd: cmd.cwd !== undefined ? expandPath(cmd.cwd) : undefined,
    redirect: cmd.redirect !== undefined ? { ...cmd.redirect, path: expandPath(cmd.redirect.path) } : undefined,
  };
}
