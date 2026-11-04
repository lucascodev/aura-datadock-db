import { describe, expect, it } from 'vitest';
import { resolveProtectionSetting } from '../../../../src/application/settings/resolveProtectionSetting';

describe('resolveProtectionSetting', () => {
  it('uses the default when nothing is set', () => {
    expect(resolveProtectionSetting({ defaultValue: true }, false)).toBe(true);
    expect(resolveProtectionSetting({ defaultValue: false }, true)).toBe(false);
    expect(resolveProtectionSetting(undefined, true)).toBe(true);
  });

  it('follows the choice of the user', () => {
    expect(resolveProtectionSetting({ defaultValue: true, globalValue: false }, true)).toBe(false);
    expect(resolveProtectionSetting({ defaultValue: false, globalValue: true }, false)).toBe(true);
  });

  it('does not let a repository weaken the protection', () => {
    expect(resolveProtectionSetting({ defaultValue: false, globalValue: true, workspaceValue: false }, false)).toBe(true);
    expect(resolveProtectionSetting({ defaultValue: true, workspaceValue: false }, true)).toBe(true);
    expect(resolveProtectionSetting({ defaultValue: true, workspaceFolderValue: false }, true)).toBe(true);
  });

  it('lets a repository tighten the protection', () => {
    expect(resolveProtectionSetting({ defaultValue: false, workspaceValue: true }, false)).toBe(true);
    expect(resolveProtectionSetting({ defaultValue: true, globalValue: false, workspaceFolderValue: true }, true)).toBe(true);
  });
});
