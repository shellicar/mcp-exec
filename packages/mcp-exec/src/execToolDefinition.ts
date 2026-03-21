import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { builtinRules } from './builtinRules';
import { ExecToolDescription, ExecToolName } from './consts';
import { execute } from './execute';
import { normaliseInput } from './normaliseInput';
import { ExecInputSchema, ExecOutputSchema } from './schema';
import { stripAnsi } from './stripAnsi';
import type { ExecConfig, ExecInput, ExecOutput, ExecuteResult } from './types';
import { validate } from './validate';

type TextContent = { type: 'text'; text: string };
type ToolOutput<T> = { content: TextContent[]; structuredContent: T; isError?: boolean };
type ExecToolHandler = (input: ExecInput) => Promise<ToolOutput<ExecOutput>>;

/** Register the exec tool on an existing McpServer instance. */
export const execToolDefinition = (server: McpServer, config?: ExecConfig): void => {
  const cwd = config?.cwd ?? process.cwd();
  const rules = config?.rules ?? builtinRules;

  const handler: ExecToolHandler = async (input) => {
    const { allowed, errors } = validate(input.commands, rules);
    if (!allowed) {
      return {
        content: [{ type: 'text', text: `BLOCKED:\n${errors.join('\n')}` }],
        structuredContent: { results: [], success: false },
        isError: true,
      };
    }

    const result = await execute(input, cwd);
    const clean = input.stripAnsi ? stripAnsi : (s: string) => s;

    const label =
      input.commands.length === 1
        ? input.commands[0].program
        : `pipeline(${input.commands.map((c) => c.program).join(' | ')})`;

    const r = result.results[0];
    const stepOutput = JSON.stringify({
      step: 1,
      command: label,
      exitCode: r?.exitCode ?? undefined,
      stdout: clean(r?.stdout ?? '').trimEnd(),
      stderr: clean(r?.stderr ?? '').trimEnd(),
      signal: r?.signal ?? undefined,
    } satisfies ExecuteResult);

    return {
      content: [{ type: 'text', text: stepOutput }],
      structuredContent: { results: result.results, success: result.success } satisfies ExecOutput,
      isError: !result.success,
    };
  };

  const normaliseHandler: ExecToolHandler = async (rawInput) => {
    return await handler(normaliseInput(rawInput));
  };

  server.registerTool(
    ExecToolName,
    { description: ExecToolDescription, inputSchema: ExecInputSchema.shape, outputSchema: ExecOutputSchema.shape },
    normaliseHandler,
  );
};
