<!-- BEGIN:REPO:title -->
# @shellicar/mcp-exec — Repo Memory
<!-- END:REPO:title -->

<!-- BEGIN:TEMPLATE:session-protocol -->
## Session Protocol

Every session has three phases. Follow them in order — session start sets up the workspace, work is the development, session end records what happened. Start and end wrap the work so nothing is lost.

```
- [ ] Session start
- [ ] <your work steps here>
- [ ] Session end
```

### Session Start
1. Read this file
2. Find recent session logs: `find .claude/sessions -name '*.md' 2>/dev/null | sort -r | head -5`
3. Read session logs found — understand current state before doing anything
4. Create or switch to the correct branch (if specified in prompt)
5. Build your TODO list using TodoWrite — include all work steps from the prompt, then append `Session end` as the final item
6. Present the TODO list to the user before starting work

### Work
This is where you do the actual development — writing code, fixing bugs, running tests, verifying changes. Each step from the prompt becomes a TODO item.

- Work incrementally — one task at a time
- Mark each TODO in-progress before starting, completed immediately after finishing
- If a TODO is dropped, mark it `[-]` with a brief reason — never silently remove a task
- Commit with descriptive messages after each meaningful change
- If your prompt includes WORK ITEMS, reference them in commit messages (e.g. `#82`, `AB#1234`)
- Be proactive — after completing a step, start the next one. If blocked, say why.

Verification (type-check, tests, lint, asking the user to test) is part of your work steps, not session end. Include it where it makes sense for the changes you made.

### Session End

Session end is bookkeeping. Do not start until all work steps are complete.

1. Write session log to `.claude/sessions/YYYY-MM-DD.md`:
   ```
   ### HH:MM — [area/task]
   - Did: (1-3 bullets)
   - Files: (changed files)
   - Decisions: (what and why — include dropped tasks and why)
   - Next: (what remains / blockers)
   - Violations: (any protocol violations, or "None")
   ```
2. Update `Current State` below if branch or in-progress work changed
3. Update `Recent Decisions` below if you made an architectural decision
4. Commit — session log and state updates MUST be in this commit
5. Push to remote
6. Create PR (if appropriate)

**Why push and PR are last:** The session log and state updates are tracked files. They must be committed with the code they describe — one commit, one push, one PR that includes everything. If you push first and write the log after, it either gets left out or requires a second push.
<!-- END:TEMPLATE:session-protocol -->

<!-- BEGIN:TEMPLATE:prompt-delivery -->
## Prompt Delivery

Your assignment may have been dispatched from a prompt file in the fleet PM repo. If the user tells you the prompt source path, update its `Status` field in the YAML frontmatter at these points:

| When | Set Status to |
|------|---------------|
| Session start (after reading the prompt) | `received` |
| Starting development work | `in-progress` |
| Work suspended, will resume later | `paused` |
| All deliverables complete | `completed` |

Only update the `Status` field — do not modify any other frontmatter or prompt content. The PM handles all other prompt tracking.
<!-- END:TEMPLATE:prompt-delivery -->

<!-- BEGIN:REPO:current-state -->
## Current State
Branch: `feature/general-improvements`
In-progress: PR #3 open — https://github.com/shellicar/mcp-exec/pull/3. Ready for review/merge.
<!-- END:REPO:current-state -->

<!-- BEGIN:REPO:architecture -->
## Architecture

**Stack**: TypeScript, pnpm workspaces, Turbo, Biome, Lefthook, GitVersion

**Monorepo structure**:

| Package | Path | Purpose |
|---------|------|---------|
| `@shellicar/mcp-exec` | `packages/mcp-exec` | MCP server for structured command execution |
| `@shellicar-mcp-exec/typescript-config` | `packages/typescript-config` | Shared tsconfig |
| `@shellicar-mcp-exec/example-basic` | `examples/basic` | Usage example |

**Key source files** (`packages/mcp-exec/src/`):

| File | Role |
|------|------|
| `createExecServer.ts` | MCP server factory — creates stdio server |
| `execToolDefinition.ts` | Tool definition with Zod schema |
| `execute.ts` | Step orchestration with chaining logic |
| `execStep.ts` | Dispatcher: command vs pipeline |
| `execCommand.ts` | Single command via `child_process.spawn()` |
| `execPipeline.ts` | Pipeline: chain stdout -> stdin across commands |
| `expandPath.ts` | Expand `~` and `$VAR` in path strings |
| `normaliseInput.ts` | Pre-validation expansion of path-like fields (program, cwd, redirect.path) |
| `schema.ts` | Input/output Zod schemas |
| `types.ts` | TypeScript types (inferred from schemas) |
| `builtinRules.ts` | 13 built-in validation rules |
| `validate.ts` | Rule runner — checks all rules against all steps |
| `hasShortFlag.ts` | Short flag detection helper |
| `extractCommands.ts` | Extract Command objects from Step (for validation) |
| `stripAnsi.ts` | ANSI escape sequence removal |
| `consts.ts` | Tool name, server name, description |
| `entry/cli.ts` | CLI entry point (bin: `mcp-exec`) |
| `entry/index.ts` | Library entry point (exports) |

**Tests** (`packages/mcp-exec/test/`):

| File | Coverage |
|------|----------|
| `executor.spec.ts` | Command execution and chaining |
| `validation.spec.ts` | All 13 validation rules |
| `stripAnsi.spec.ts` | ANSI stripping |
| `expandPath.spec.ts` | Path expansion |
| `normaliseInput.spec.ts` | Pre-validation normalisation |
<!-- END:REPO:architecture -->

<!-- BEGIN:REPO:conventions -->
## Conventions

- **TypeScript** throughout — `pnpm check-types` to verify
- **Zod v4** for schema validation
- **@modelcontextprotocol/sdk** for MCP server implementation
- **tsup** for building (produces `dist/`)
- No shell interpretation — commands are `{ program, args[] }`, spawned directly
- Build output: `dist/` via tsup
<!-- END:REPO:conventions -->

<!-- BEGIN:REPO:linting-formatting -->
## Linting & Formatting

- **Formatter/linter**: `biome`
- **Git hooks**: `lefthook` — runs biome on commit
- **Fix command**: `pnpm biome check --diagnostic-level=error --write`
- If biome reports only **unsafe** fixes, do NOT use `--write --unsafe` — fix manually
- Do NOT hand-edit formatting — use biome
- **Type check**: `pnpm check-types`
- **Build**: `pnpm build`
- **Test**: `pnpm test`
<!-- END:REPO:linting-formatting -->

<!-- BEGIN:REPO:key-patterns -->
## Key Patterns

### Validation Rules

13 built-in rules block dangerous operations before execution. Rules are defined in `builtinRules.ts` and checked by `validate.ts` against all steps before any execution begins.

Custom rules can be provided via `ExecServerOptions.rules`.

### Chaining Modes

| Mode | Behaviour |
|------|-----------|
| `bail_on_error` (default) | Stop on first non-zero exit code |
| `sequential` | Run all steps, return combined results |
| `independent` | Run all steps, report each separately |

### Pipeline Support

Pipeline steps chain stdout -> stdin across commands. Supports `stdin` on the first command and `redirect` on the last. Stderr is collected from all commands.

### No Shell Expansion

Globs, tilde, `$VAR` in args are NOT expanded — must be literal values. ENOENT returns exit code 127 (matches shell convention).
<!-- END:REPO:key-patterns -->

<!-- BEGIN:REPO:known-debt -->
## Known Debt / Gotchas

1. **Args not expanded** — `~` and `$VAR` in args are NOT expanded. Only `program`, `cwd`, and `redirect.path` are expanded.
2. **ENOENT exit codes** — exit 126 for cwd-not-found, exit 127 for program-not-found.
3. **Pipeline middle-command ENOENT** — undetected if a middle command in a pipeline is not found (issue #4).
4. **Pipeline stderr** — collected from all commands, not just the last.
5. **Timeout** — applied per-execution, not per-step.
<!-- END:REPO:known-debt -->

<!-- BEGIN:REPO:recent-decisions -->
## Recent Decisions

- **Extracted from claude-cli** — exec tool moved from `src/mcp/shellicar/` in claude-cli to standalone package. 13 validation rules (expanded from original 7). Zod v4 schemas.
- **Monorepo structure** — pnpm workspaces with turbo. Follows @shellicar ecosystem conventions.
- **Zod v4 z.infer = z.input** — use `z.output` for exported types (Zod v4 changed `z.infer` to map to input type, not output).
- **ENOENT differentiation** — exit 126 for cwd-not-found, exit 127 for program-not-found. Check cwd existence before spawning.
- **Normalisation layer** — path expansion (`~`, `$VAR`) happens in `normaliseInput.ts` before validation and execution. Only `program`, `cwd`, and `redirect.path` are expanded; `args` are not.
- **merge_stderr on all commands** — `merge_stderr` applies to single commands and pipeline commands equally. No pipeline-only restriction.
<!-- END:REPO:recent-decisions -->

<!-- BEGIN:REPO:extra -->
<!-- END:REPO:extra -->
