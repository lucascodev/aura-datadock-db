import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface SettingDefinition {
  readonly scope?: string;
  readonly default?: unknown;
}

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
  capabilities: { untrustedWorkspaces: { supported: unknown }; virtualWorkspaces: { supported: unknown } };
  contributes: { configuration: { properties: Record<string, SettingDefinition> } };
};
const settings = manifest.contributes.configuration.properties;
const USER_ONLY_SCOPES = ['machine', 'application'];

describe('manifest protections', () => {
  it.each(['dockerHost', 'connections', 'ai.provider', 'ai.model', 'ai.ollamaUrl', 'mcp.enabled'])('does not let a repository set %s', (name) => {
    expect(USER_ONLY_SCOPES).toContain(settings[`auraDataDockDb.${name}`].scope);
  });

  it('leaves the MCP server off until the user turns it on', () => {
    expect(settings['auraDataDockDb.mcp.enabled'].default).toBe(false);
    expect(readFileSync('src/presentation/vscode/mcp/registerMcpProvider.ts', 'utf8')).toContain("get<boolean>('mcp.enabled', false)");
  });

  it('does not run in a workspace that was not trusted', () => {
    expect(manifest.capabilities.untrustedWorkspaces.supported).toBe(false);
    expect(manifest.capabilities.virtualWorkspaces.supported).toBe(false);
  });
});
