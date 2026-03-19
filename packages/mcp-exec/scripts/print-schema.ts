import { z } from 'zod';
import { ExecInputSchema } from '../src/schema.js';

// biome-ignore lint/suspicious/noConsole: test script
console.log(JSON.stringify(z.toJSONSchema(ExecInputSchema), null, 2));
