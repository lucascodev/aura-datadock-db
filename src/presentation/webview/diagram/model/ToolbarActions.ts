import type { DiagramDetail } from '../../../../application/diagram/model/DiagramModel';

export interface ToolbarActions {
  onNamespaceChange(namespace: string): void;
  onDetailChange(detail: DiagramDetail): void;
  onSearch(text: string): void;
  onSearchSubmit(): void;
  onZoomOut(): void;
  onZoomIn(): void;
  onFit(): void;
  onAutoLayout(): void;
  onRefresh(): void;
  onExportChoice(choice: string): void;
}
