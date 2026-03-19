import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createExecServer, type ExecConfig } from '@shellicar/mcp-exec';

const config: ExecConfig = {
  cwd: process.cwd(),
};

// Create the server
const server = createExecServer(config);

// Wire up an in-process client ↔ server pair
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);

const client = new Client({ name: 'example', version: '1.0.0' });
await client.connect(clientTransport);

// List available tools
const { tools } = await client.listTools();
console.log(
  'Tools:',
  tools.map((t) => t.name),
);

// Call the exec tool
const result = await client.callTool({
  name: 'exec',
  arguments: {
    description: 'show node version and list src files',
    steps: [
      { type: 'command', program: 'node', args: ['--version'] },
      { type: 'command', program: 'ls', args: ['-1', 'src/entry'] },
    ],
    chaining: 'bail_on_error',
  },
});

type ContentType = {
  type: 'text';
  text: string;
  annotations?:
    | {
        audience?: ('user' | 'assistant')[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      }
    | undefined;
};

for (const block of result.content as ContentType[]) {
  if (block.type === 'text') {
    console.log(JSON.parse(block.text));
  }
}

await client.close();
