import type { SavedConnection } from '../../../domain/connection/SavedConnection';
import type { ConnectionInput } from './ConnectionInput';

export type ConnectionFieldErrors = Partial<Record<keyof ConnectionInput, string>>;

export type ConnectionValidation =
  | { readonly isValid: true; readonly connection: Omit<SavedConnection, 'id'> }
  | { readonly isValid: false; readonly errors: ConnectionFieldErrors };
