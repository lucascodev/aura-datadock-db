interface ProtectionSettingLevels {
  readonly defaultValue?: boolean;
  readonly globalValue?: boolean;
  readonly workspaceValue?: boolean;
  readonly workspaceFolderValue?: boolean;
}

export function resolveProtectionSetting(levels: ProtectionSettingLevels | undefined, fallback: boolean): boolean {
  const userChoice = levels?.globalValue ?? levels?.defaultValue ?? fallback;
  return userChoice || levels?.workspaceValue === true || levels?.workspaceFolderValue === true;
}
