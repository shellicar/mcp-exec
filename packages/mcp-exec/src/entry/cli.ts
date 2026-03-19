#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createExecServer } from '../createExecServer';

const server = createExecServer();
const transport = new StdioServerTransport();
await server.connect(transport);
