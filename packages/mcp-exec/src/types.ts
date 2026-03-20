import type { z } from 'zod';
import type {
  CommandSchema,
  ExecInputSchema,
  ExecOutputSchema,
  ExecuteResultSchema,
  PipelineSchema,
  RedirectSchema,
  SingleCommandSchema,
  StepResultSchema,
  StepSchema,
} from './schema';

// --- Internal types ---
export type StepResult = z.infer<typeof StepResultSchema>;
export type ExecuteResult = z.infer<typeof ExecuteResultSchema>;

export type Redirect = z.infer<typeof RedirectSchema>;
export type Command = z.output<typeof CommandSchema>;
export type Pipeline = z.output<typeof PipelineSchema>;
export type SingleCommand = z.output<typeof SingleCommandSchema>;
export type Step = z.output<typeof StepSchema>;

// --- Public API types ---

/** The parsed input to the exec tool. */
export type ExecInput = z.output<typeof ExecInputSchema>;
export type ExecOutput = z.infer<typeof ExecOutputSchema>;

/** A validation rule applied to each step before execution. */
export interface ExecRule {
  /** Rule name for error messages */
  name: string;
  /** Return error message if blocked, undefined if allowed */
  check: (step: Step) => string | undefined;
}

/** Configuration for the exec tool and server. */
export interface ExecConfig {
  /** Working directory for command execution. Defaults to process.cwd(). */
  cwd?: string;
  /** Validation rules applied before each execution. Defaults to builtinRules. */
  rules?: ExecRule[];
}
