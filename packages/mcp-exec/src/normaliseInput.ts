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
  const { program, cwd, redirect, ...rest } = cmd;
  return {
    ...rest,
    program: expandPath(program),
    cwd: expandPath(cwd),
    redirect: redirect && { ...redirect, path: expandPath(redirect.path) },
  };
}
