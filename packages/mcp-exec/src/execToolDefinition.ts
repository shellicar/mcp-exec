import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { builtinRules } from './builtinRules';
import { ExecToolDescription, ExecToolName } from './consts';
import { execute } from './execute';
import { normaliseInput } from './normaliseInput';
import { ExecInputSchema, ExecOutputSchema } from './schema';
import { stripAnsi } from './stripAnsi';
import type { Command, ExecConfig, ExecuteResult } from './types';
import { validate } from './validate';

/** Register the exec tool on an existing McpServer instance. */

export const execToolDefinition = (server: McpServer, config?: ExecConfig): void => {
  const cwd = config?.cwd ?? process.cwd();
  const rules = config?.rules ?? builtinRules;

  server.registerTool(
    ExecToolName,
    { description: ExecToolDescription, inputSchema: ExecInputSchema.shape, outputSchema: ExecOutputSchema.shape },
    async (rawInput) => {
      const input = normaliseInput(rawInput);
      const { allowed, errors } = validate(input.steps, rules);
      if (!allowed) {
        return {
          content: [{ type: 'text' as const, text: `BLOCKED:\n${errors.join('\n')}` }],
          isError: true,
        };
      }

      const result = await execute(input, cwd);
      const clean = input.stripAnsi ? stripAnsi : (s: string) => s;

      const content = input.steps.map((step, i) => {
        const r = result.results[i];
        const label =
          step.type === 'command'
            ? step.program
            : `pipeline(${step.commands.map((c: Command) => c.program).join(' | ')})`;

        const stepOutput = JSON.stringify({
          step: i + 1,
          command: label,
          exitCode: r?.exitCode ?? undefined,
          stdout: clean(r?.stdout ?? '').trimEnd(),
          stderr: clean(r?.stderr ?? '').trimEnd(),
          signal: r?.signal ?? undefined,
        } satisfies ExecuteResult);

        return { type: 'text' as const, text: stepOutput };
      });

      return {
        content: content.length > 0 ? content : [{ type: 'text' as const, text: '(no output)' }],
        isError: !result.success,
      };
    },
  );
};
