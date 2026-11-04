type BindingListener = () => void;

export class QueryDocumentBindings {
  private readonly connectionByDocument = new Map<string, string>();
  private readonly listeners = new Set<BindingListener>();

  bind(documentUri: string, connectionKey: string): void {
    this.connectionByDocument.set(documentUri, connectionKey);
    this.emit();
  }

  unbind(documentUri: string): void {
    if (this.connectionByDocument.delete(documentUri)) {
      this.emit();
    }
  }

  get(documentUri: string): string | undefined {
    return this.connectionByDocument.get(documentUri);
  }

  onDidChange(listener: BindingListener): { dispose(): void } {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}
