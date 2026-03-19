import { z } from 'zod';

// --- Redirect: structured output redirection ---
export const RedirectSchema = z.object({
  path: z.string().describe('File path to redirect output to'),
  stream: z.enum(['stdout', 'stderr', 'both']).default('stdout').describe('Which output stream to redirect'),
  append: z.boolean().default(false).describe('Append to file instead of overwriting'),
});

// --- Atomic command: one program invocation ---
export const CommandSchema = z.object({
  program: z.string().describe('The program/binary to execute'),
  args: z.array(z.string()).default([]).describe('Arguments to the program'),
  stdin: z.string().optional().describe('Content to pipe to stdin (replaces heredocs)'),
  redirect: RedirectSchema.optional().describe('Redirect output to a file'),
  cwd: z.string().optional().describe('Working directory for this command'),
  env: z.record(z.string(), z.string()).optional().describe('Environment variables to set'),
});

// --- Pipeline: commands connected by pipes ---
export const PipelineSchema = z.object({
  type: z.literal('pipeline'),
  commands: z.array(CommandSchema).min(2).describe('Commands connected by pipes (stdout → stdin)'),
});

// --- Single command (no piping) ---
export const SingleCommandSchema = z.object({
  type: z.literal('command'),
  ...CommandSchema.shape,
});

// --- A step is either a single command or a pipeline ---
export const StepSchema = z.discriminatedUnion('type', [SingleCommandSchema, PipelineSchema]);

// --- The full tool input schema ---
export const ExecInputSchema = z.object({
  description: z.string().describe('Brief description of what these commands do'),
  steps: z.array(StepSchema).min(1).describe('Commands to execute in order'),
  chaining: z
    .enum(['sequential', 'independent', 'bail_on_error'])
    .default('bail_on_error')
    .describe('sequential: run all (;). bail_on_error: stop on first failure (&&). independent: run all, report each.'),
  timeout: z.number().max(600000).optional().describe('Timeout in ms (max 600000)'),
  background: z.boolean().default(false).describe('Run in background, collect results later'),
  stripAnsi: z
    .boolean()
    .default(true)
    .describe('Strip ANSI escape codes from output (default: true). Set false to preserve raw color/formatting codes.'),
});

export const StepResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int().nullable(),
  signal: z.string().nullable(),
});

export const ExecuteResultSchema = z.object({
  step: z.number().int(),
  command: z.string(),
  exitCode: z.number().int().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  signal: z.string().optional(),
});

export const ExecOutputSchema = z.object({
  results: StepResultSchema.array(),
  success: z.boolean(),
});
