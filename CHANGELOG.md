# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-preview.4] - 2026-03-22

### Breaking Changes

- Replaced discriminated union (`type: 'command'` / `type: 'pipeline'`) with a unified `commands` array on each step. Single command: one element; pipeline: two or more elements connected via stdout→stdin. The `type` field is removed entirely.
- `ExecRule.check` now receives `Command[]` instead of a `Step`

## [1.0.0-preview.3] - 2026-03-20

### Fixed

- Tool handler now returns `structuredContent` matching `ExecOutputSchema` when `outputSchema` is registered, fixing MCP SDK validation error `-32602`

## [1.0.0-preview.2] - 2026-03-20

### Added

- Path expansion (`~` and `$VAR`) for `program`, `cwd`, and `redirect.path` fields
- `merge_stderr` support on single commands (equivalent to `2>&1`)
- Differentiated ENOENT exit codes: exit 126 for working directory not found, exit 127 for program not found

## [1.0.0-preview.1] - 2026-03-19

### Added

- Exec tool for running commands and pipelines via MCP with sequential, bail-on-error, and independent chaining modes
- Support for stdin injection, environment variables, working directory, output redirection, ANSI stripping, timeout, and background execution
- Built-in validation rules blocking destructive operations including rm, sed -i, git reset, force push, xargs, and sudo
- Pluggable rule system for custom validation

[1.0.0-preview.4]: https://github.com/shellicar/mcp-exec/releases/tag/1.0.0-preview.4
[1.0.0-preview.3]: https://github.com/shellicar/mcp-exec/releases/tag/1.0.0-preview.3
[1.0.0-preview.2]: https://github.com/shellicar/mcp-exec/releases/tag/1.0.0-preview.2
[1.0.0-preview.1]: https://github.com/shellicar/mcp-exec/releases/tag/1.0.0-preview.1
