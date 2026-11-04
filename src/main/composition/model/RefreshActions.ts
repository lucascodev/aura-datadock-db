export interface RefreshActions {
  refreshTrees(): void;
  refresh(): Promise<void>;
}
