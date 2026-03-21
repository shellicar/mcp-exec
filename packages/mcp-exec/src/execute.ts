import { execCommand } from './execCommand';
import { execPipeline } from './execPipeline';
import type { ExecInput, ExecOutput, StepResult } from './types';

/** Execute commands: single command if one, pipeline if two or more. */
export async function execute(input: ExecInput, cwd: string): Promise<ExecOutput> {
  let result: StepResult | undefined;
  const [c1, c2, ...rest] = input.commands;
  if (c2 == null) {
    result = await execCommand(c1, cwd, input.timeout);
  } else {
    result = await execPipeline([c1, c2, ...rest], cwd, input.timeout);
  }

  return { results: [result], success: result.exitCode === 0 };
}
