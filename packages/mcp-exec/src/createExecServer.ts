import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { execToolDefinition } from './execToolDefinition';
import type { ExecConfig } from './types';

/** Create a configured McpServer with the exec tool registered. */

export function createExecServer(config?: ExecConfig): McpServer {
  const server = new McpServer({ name: 'mcp-exec', version: '1.0.0' });
  execToolDefinition(server, config);
  return server;
}
