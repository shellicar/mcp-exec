import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { builtinRules } from './builtinRules';
import { ExecToolName } from './consts';
import { execute } from './execute';
import { normaliseInput } from './normaliseInput';
import { ExecInputSchema, ExecOutputSchema, ExecToolDescription } from './schema';
import { stripAnsi } from './stripAnsi';
import type { ExecConfig, ExecInput, ExecOutput } from './types';
import { validate } from './validate';

type TextContent = { type: 'text'; text: string };
type ToolOutput<T> = { content: TextContent[]; structuredContent: T; isError?: boolean };
type ExecToolHandler = (input: ExecInput) => Promise<ToolOutput<ExecOutput>>;

/** Register the exec tool on an existing McpServer instance. */
export const execToolDefinition = (server: McpServer, config?: ExecConfig): void => {
  const cwd = config?.cwd ?? process.cwd();
  const rules = config?.rules ?? builtinRules;

  const handler: ExecToolHandler = async (input) => {
    const allCommands = input.steps.flatMap((s) => s.commands);
    const { allowed, errors } = validate(allCommands, rules);
    if (!allowed) {
      return {
        content: [{ type: 'text', text: `BLOCKED:\n${errors.join('\n')}` }],
        structuredContent: { results: [], success: false },
        isError: true,
      };
    }

    const result = await execute(input, cwd);
    const clean = input.stripAnsi ? stripAnsi : (s: string) => s;

    const canonical: ExecOutput = {
      results: result.results.map((r) => ({
        ...r,
        stdout: clean(r.stdout).trimEnd(),
        stderr: clean(r.stderr).trimEnd(),
      })),
      success: result.success,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(canonical) }],
      structuredContent: canonical,
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
