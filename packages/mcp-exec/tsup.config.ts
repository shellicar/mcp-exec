import cleanPlugin from '@shellicar/build-clean/esbuild';
import { defineConfig } from 'tsup';

export default defineConfig((config) => ({
  bundle: true,
  clean: false,
  dts: true,
  entry: ['src/entry/*.ts'],
  esbuildPlugins: [cleanPlugin({ destructive: true })],
  keepNames: true,
  minify: config.watch ? false : 'terser',
  removeNodeProtocol: false,
  sourcemap: true,
  splitting: true,
  target: 'node24',
  treeshake: true,
  tsconfig: 'tsconfig.json',
  format: 'esm',
  outDir: 'dist',
}));
