# @shellicar/mcp-exec

> An MCP server that runs commands without a shell, with built-in rules to block destructive operations

[![npm package](https://img.shields.io/npm/v/@shellicar/mcp-exec.svg)](https://npmjs.com/package/@shellicar/mcp-exec)
[![build status](https://github.com/shellicar/mcp-exec/actions/workflows/node.js.yml/badge.svg)](https://github.com/shellicar/mcp-exec/actions/workflows/node.js.yml)

## Features

* 🛡️ Built-in validation rules blocking destructive operations before execution
* 🔗 Pipeline support with stdout piped to stdin across commands
* ⚙️ Three chaining modes: sequential, bail-on-error, and independent
* 📂 Per-step working directory, environment variables, and stdin injection
* 📝 Output redirection to file with append support
* 🔌 Pluggable rule system for custom validation rules
* 🧹 ANSI code stripping for clean output

## Installation & Quick Start

```sh
npm i --save @shellicar/mcp-exec
```

```sh
pnpm add @shellicar/mcp-exec
```

```ts
import { createExecServer } from '@shellicar/mcp-exec';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createExecServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

<!-- BEGIN_ECOSYSTEM -->

## @shellicar TypeScript Ecosystem

### MCP Servers

- [`@shellicar/mcp-exec`](https://github.com/shellicar/mcp-exec) - An MCP server that runs commands without a shell, with built-in rules to block destructive operations.

### Core Libraries

- [`@shellicar/core-config`](https://github.com/shellicar/core-config) - A library for securely handling sensitive configuration values like connection strings, URLs, and secrets.
- [`@shellicar/core-di`](https://github.com/shellicar/core-di) - A basic dependency injection library.

### Reference Architectures

- [`@shellicar/reference-foundation`](https://github.com/shellicar/reference-foundation) - A comprehensive starter repository. Illustrates individual concepts.
- [`@shellicar/reference-enterprise`](https://github.com/shellicar/reference-enterprise) - A comprehensive starter repository. Can be used as the basis for creating a new Azure application workload.

### Build Tools

- [`@shellicar/build-clean`](https://github.com/shellicar/build-clean) - Build plugin that automatically cleans unused files from output directories.
- [`@shellicar/build-version`](https://github.com/shellicar/build-version) - Build plugin that calculates and exposes version information through a virtual module import.
- [`@shellicar/build-graphql`](https://github.com/shellicar/build-graphql) - Build plugin that loads GraphQL files and makes them available through a virtual module import.
- [`@shellicar/graphql-codegen-treeshake`](https://github.com/shellicar/graphql-codegen-treeshake) - A graphql-codegen preset that tree-shakes unused types from TypeScript output.

### Framework

- [`@shellicar/svelte-adapter-azure-functions`](https://github.com/shellicar/svelte-adapter-azure-functions) - A [SvelteKit adapter](https://kit.svelte.dev/docs/adapters) that builds your app into an Azure Function.
- [`@shellicar/cosmos-query-builder`](https://github.com/shellicar/cosmos-query-builder) - Helper class for type safe advanced queries for Cosmos DB (Sql Core).
- [`@shellicar/ui-shadcn`](https://github.com/shellicar/ui-shadcn) - Shared Svelte 5 component library built on shadcn-svelte with Tailwind CSS v4 theming.

### Logging & Monitoring

- [`@shellicar/winston-azure-application-insights`](https://github.com/shellicar/winston-azure-application-insights) - An [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights/) transport for [Winston](https://github.com/winstonjs/winston) logging library.
- [`@shellicar/pino-applicationinsights-transport`](https://github.com/shellicar/pino-applicationinsights-transport) - [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights) transport for [pino](https://github.com/pinojs/pino)

<!-- END_ECOSYSTEM -->

## Motivation

Claude Code's Bash tool passes commands through a shell interpreter. That means shell expansion, operator chaining, pipes, heredocs, and subshells all execute before any permission check can inspect them. A single `bash -c` call can hide anything.

`mcp-exec` removes the shell entirely. Commands are structured as JSON (program, arguments, working directory, environment), which means the model is constrained by its schema training. When the input is a JSON schema, Claude doesn't guess: it produces valid calls with the precision of Excalibur. JSON-calibur, if you will.

Validation rules check every command against configurable policies before anything executes. Destructive operations like `rm -rf`, `git push --force`, and `git reset --hard` are blocked by default. No shell means no surprises. No surprises means you can actually trust the agent with your repo.

## Feature Examples

* Run a standalone MCP server.

```ts
import { createExecServer } from '@shellicar/mcp-exec';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createExecServer({ cwd: '/workspace' });
await server.connect(new StdioServerTransport());
```

* Add the exec tool to an existing MCP server.

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { execToolDefinition } from '@shellicar/mcp-exec';

const server = new McpServer({ name: 'my-server', version: '1.0.0' });
execToolDefinition(server, { cwd: '/workspace' });
```

* Add custom validation rules alongside or instead of the built-in set.

```ts
import { createExecServer, builtinRules } from '@shellicar/mcp-exec';
import type { ExecRule } from '@shellicar/mcp-exec';

const noNpm: ExecRule = {
  name: 'no-npm',
  check: (commands) => {
    if (commands.some((c) => c.program === 'npm')) {
      return 'Use pnpm instead of npm.';
    }
    return undefined;
  },
};

const server = createExecServer({ rules: [...builtinRules, noNpm] });
```

## Built-in Rules

| Rule | Blocks |
|---|---|
| `no-destructive-commands` | `rm`, `rmdir`, `mkfs`, `dd`, `shred` |
| `no-xargs` | `xargs` |
| `no-sed-in-place` | `sed -i` / `--in-place` |
| `no-git-rm` | `git rm` |
| `no-git-checkout` | `git checkout` |
| `no-git-reset` | `git reset` |
| `no-force-push` | `git push --force` / `-f` |
| `no-exe` | `.exe` calls |
| `no-sudo` | `sudo` |
| `no-git-C` | `git -C` |
| `no-pnpm-C` | `pnpm -C` |
| `no-env-dump` | `env` / `printenv` without arguments |
