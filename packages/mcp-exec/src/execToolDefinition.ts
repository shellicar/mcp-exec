import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { builtinRules } from './builtinRules';
import { ExecToolDescription, ExecToolName } from './consts';
import { execute } from './execute';
import { normaliseInput } from './normaliseInput';
import { ExecInputSchema, ExecOutputSchema } from './schema';
import { stripAnsi } from './stripAnsi';
import type { Command, ExecConfig, ExecInput, ExecOutput, ExecuteResult } from './types';
import { validate } from './validate';

type TextContent = { type: 'text'; text: string };
type ToolOutput<T> = { content: TextContent[]; structuredContent: T; isError?: boolean };
type ExecToolHandler = (input: ExecInput) => Promise<ToolOutput<ExecOutput>>;

/** Register the exec tool on an existing McpServer instance. */

export const execToolDefinition = (server: McpServer, config?: ExecConfig): void => {
  const cwd = config?.cwd ?? process.cwd();
  const rules = config?.rules ?? builtinRules;

  const handler: ExecToolHandler = async (input) => {
    const { allowed, errors } = validate(input.steps, rules);
    if (!allowed) {
      return {
        content: [{ type: 'text', text: `BLOCKED:\n${errors.join('\n')}` }],
        structuredContent: { results: [], success: false },
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
      content: content.length > 0 ? content : [{ type: 'text', text: '(no output)' }],
      structuredContent: { results: result.results, success: result.success },
      isError: !result.success,
    };
  };

  server.registerTool(
    ExecToolName,
    { description: ExecToolDescription, inputSchema: ExecInputSchema.shape, outputSchema: ExecOutputSchema.shape },
    (rawInput) => handler(normaliseInput(rawInput)),
  );
};
