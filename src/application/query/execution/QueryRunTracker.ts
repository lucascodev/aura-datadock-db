export class QueryRunTracker {
  private current?: AbortController;

  get isRunning(): boolean {
    return this.current !== undefined;
  }

  begin(): AbortController | undefined {
    if (this.current) {
      return undefined;
    }
    this.current = new AbortController();
    return this.current;
  }

  cancel(): boolean {
    if (!this.current) {
      return false;
    }
    this.current.abort();
    return true;
  }

  finish(): void {
    this.current = undefined;
  }
}
