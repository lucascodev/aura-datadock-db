import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  external: ['vscode', 'pg-native'],
};

const contexts = await Promise.all([
  esbuild.context({ ...shared, entryPoints: ['src/extension.ts'], outfile: 'dist/extension.js' }),
  esbuild.context({ ...shared, entryPoints: ['src/mcp/server.ts'], outfile: 'dist/mcp-server.js' }),
]);

if (watch) {
  await Promise.all(contexts.map((context) => context.watch()));
} else {
  await Promise.all(contexts.map((context) => context.rebuild()));
  await Promise.all(contexts.map((context) => context.dispose()));
}
