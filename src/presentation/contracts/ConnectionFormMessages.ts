import type { ConnectionInput } from '../../application/connections/saved/ConnectionInput';
import type { ConnectionFieldErrors } from '../../application/connections/saved/ConnectionValidation';

export type ConnectionFileField = 'caFile' | 'sshIdentityFile';

export type ConnectionFormHostMessage =
  | { readonly type: 'init'; readonly isEditing: boolean; readonly input?: ConnectionInput; readonly hasPassword: boolean }
  | { readonly type: 'errors'; readonly errors: ConnectionFieldErrors }
  | { readonly type: 'testResult'; readonly isSuccess: boolean; readonly message: string }
  | { readonly type: 'fileChosen'; readonly field: ConnectionFileField; readonly path: string };

export type ConnectionFormWebviewMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'save'; readonly input: ConnectionInput; readonly password: string }
  | { readonly type: 'test'; readonly input: ConnectionInput; readonly password: string }
  | { readonly type: 'cancel' }
  | { readonly type: 'chooseFile'; readonly field: ConnectionFileField };
