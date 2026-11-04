import type { ConnectionInput } from '../../../../application/connections/model/ConnectionInput';
import type { Tabs } from '../../shared/dom/Tabs';
import type { FormTabId } from '../model/FormTabId';

const TAB_ORDER: readonly FormTabId[] = ['connection', 'security', 'ssh'];

const FIELD_TABS: Readonly<Record<keyof ConnectionInput, FormTabId>> = {
  name: 'connection',
  kind: 'connection',
  host: 'connection',
  port: 'connection',
  user: 'connection',
  database: 'connection',
  tlsMode: 'security',
  caFile: 'security',
  isReadOnly: 'security',
  usesSsh: 'ssh',
  sshHost: 'ssh',
  sshPort: 'ssh',
  sshUser: 'ssh',
  sshIdentityFile: 'ssh',
  sshJumpHost: 'ssh',
};

export function revealFirstError(tabs: Tabs<FormTabId>, errors: Readonly<Partial<Record<keyof ConnectionInput, string>>>): void {
  const tabsWithErrors = new Set((Object.keys(errors) as (keyof ConnectionInput)[]).map((field) => FIELD_TABS[field]));
  tabs.markErrors(tabsWithErrors);
  const first = TAB_ORDER.find((tab) => tabsWithErrors.has(tab));
  if (first) {
    tabs.select(first);
  }
}
