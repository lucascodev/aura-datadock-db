export interface ConnectionFormControls {
  readonly heading: HTMLElement;
  readonly connectionString: HTMLInputElement;
  readonly stringStatus: HTMLElement;
  readonly kindSelect: HTMLSelectElement;
  readonly passwordInput: HTMLInputElement;
  readonly tlsSelect: HTMLSelectElement;
  readonly readOnlyCheckbox: HTMLInputElement;
  readonly usesSshCheckbox: HTMLInputElement;
  readonly caFileRow: HTMLElement;
  readonly sshSection: HTMLElement;
  readonly testStatus: HTMLElement;
  readonly testButton: HTMLButtonElement;
  readonly saveButton: HTMLButtonElement;
  readonly protectionSummary: HTMLElement;
}
