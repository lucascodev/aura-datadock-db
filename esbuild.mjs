import * as esbuild from 'esbuild';
import { rmSync } from 'node:fs';
import { writeThirdPartyNotices } from './scripts/thirdPartyNotices.mjs';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const shared = {
  bundle: true,
  sourcemap: !production,
  minify: production,
  metafile: production,
  logLevel: 'info',
};

const nodeBundle = {
  ...shared,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['vscode', 'pg-native'],
};

const webviewBundle = {
  ...shared,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
};

rmSync('dist', { recursive: true, force: true });

const contexts = await Promise.all([
  esbuild.context({ ...nodeBundle, entryPoints: ['src/main/entry/extension.ts'], outfile: 'dist/extension.js' }),
  esbuild.context({ ...nodeBundle, entryPoints: ['src/main/entry/mcpServer.ts'], outfile: 'dist/mcp-server.js' }),
  esbuild.context({ ...webviewBundle, entryPoints: ['src/presentation/webview/results/main.ts'], outfile: 'dist/webview/results.js' }),
  esbuild.context({ ...webviewBundle, entryPoints: ['src/presentation/webview/diagram/main.ts'], outfile: 'dist/webview/diagram.js' }),
  esbuild.context({ ...webviewBundle, entryPoints: ['src/presentation/webview/connection/main.ts'], outfile: 'dist/webview/connection.js' }),
  esbuild.context({ ...webviewBundle, entryPoints: ['src/presentation/webview/table/main.ts'], outfile: 'dist/webview/table.js' }),
  esbuild.context({ ...webviewBundle, entryPoints: ['src/presentation/webview/chart/main.ts'], outfile: 'dist/webview/chart.js' }),
]);

if (watch) {
  await Promise.all(contexts.map((context) => context.watch()));
} else {
  const results = await Promise.all(contexts.map((context) => context.rebuild()));
  await Promise.all(contexts.map((context) => context.dispose()));
  if (production) {
    writeThirdPartyNotices(results.map((result) => result.metafile));
  }
}
