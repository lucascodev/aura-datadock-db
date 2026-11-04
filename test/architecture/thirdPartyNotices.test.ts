import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const notices = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');
const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
const listedPackages = [...notices.matchAll(/^## (.+)@[^@\n]+$/gm)].map((match) => match[1]);

describe('third-party notices', () => {
  it('lists every runtime dependency', () => {
    expect(listedPackages).toEqual(expect.arrayContaining(Object.keys(manifest.dependencies)));
  });

  it('lists no tool that stays out of the bundle', () => {
    const tools = Object.keys(manifest.devDependencies);
    expect(listedPackages.filter((name) => tools.includes(name))).toEqual([]);
  });

  it('carries the Apache license and notice of ECharts', () => {
    const echarts = notices.slice(notices.indexOf('## echarts@'));
    expect(echarts).toContain('Apache License');
    expect(echarts).toContain('Apache ECharts');
  });

  it('ships inside the extension package', () => {
    expect(readFileSync('.vscodeignore', 'utf8')).toContain('!THIRD_PARTY_NOTICES.md');
  });
});
