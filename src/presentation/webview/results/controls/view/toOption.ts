import type { SelectOption } from '../model/SelectOption';

export function toOption(name: string): SelectOption {
  return { value: name, label: name };
}
