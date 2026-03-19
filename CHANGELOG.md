# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-preview.1] - 2026-03-19

### Added

- Exec tool for running commands and pipelines via MCP with sequential, bail-on-error, and independent chaining modes
- Support for stdin injection, environment variables, working directory, output redirection, ANSI stripping, timeout, and background execution
- Built-in validation rules blocking destructive operations including rm, sed -i, git reset, force push, xargs, and sudo
- Pluggable rule system for custom validation
