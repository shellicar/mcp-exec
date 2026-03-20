import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';
import { createExecServer } from '../src/createExecServer';

describe('integration', () => {
  let client: Client;

  afterEach(async () => {
    await client?.close();
  });

  async function setup() {
    const server = createExecServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(clientTransport);
    return client;
  }

  function echoArgs() {
    return {
      name: 'exec' as const,
      arguments: {
        description: 'echo hello',
        steps: [{ type: 'command', program: 'echo', args: ['hello'] }],
      },
    };
  }

  describe('successful command', () => {
    it('does not return an output validation error', async () => {
      const c = await setup();
      const result = await c.callTool(echoArgs());

      const content = result.content as { type: string; text: string }[];
      const texts = content.map((b) => b.text).join('\n');
      expect(texts).not.toContain('Output validation error');
      expect(result.isError).toBeFalsy();
    });

    it('returns structuredContent', async () => {
      const c = await setup();
      const result = await c.callTool(echoArgs());

      expect(result.structuredContent).toBeDefined();
    });

    it('structuredContent.success is true', async () => {
      const c = await setup();
      const result = await c.callTool(echoArgs());

      const output = result.structuredContent as { success: boolean; results: unknown[] };
      expect(output.success).toBe(true);
    });

    it('structuredContent.results contains step result', async () => {
      const c = await setup();
      const result = await c.callTool(echoArgs());

      const output = result.structuredContent as {
        success: boolean;
        results: { stdout: string; stderr: string; exitCode: number | null; signal: string | null }[];
      };
      expect(output.results).toHaveLength(1);
      expect(output.results[0]?.stdout.trim()).toBe('hello');
      expect(output.results[0]?.exitCode).toBe(0);
      expect(output.results[0]?.signal).toBeNull();
    });

    it('also returns content text blocks', async () => {
      const c = await setup();
      const result = await c.callTool(echoArgs());

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect((result.content as { type: string }[]).length).toBeGreaterThan(0);
    });
  });

  describe('blocked command', () => {
    it('returns error when command is blocked by validation rules', async () => {
      const c = await setup();
      const result = await c.callTool({
        name: 'exec',
        arguments: {
          description: 'try rm',
          steps: [{ type: 'command', program: 'rm', args: ['-rf', '/'] }],
        },
      });

      expect(result.isError).toBe(true);
      const content = result.content as { type: string; text: string }[];
      expect(content[0]?.text).toContain('BLOCKED');
      const output = result.structuredContent as { success: boolean; results: unknown[] };
      expect(output.success).toBe(false);
      expect(output.results).toHaveLength(0);
    });
  });
});
