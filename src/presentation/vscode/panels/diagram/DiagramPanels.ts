import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import { DiagramPanel } from './DiagramPanel';
import { diagramPositionsPrefix } from './diagramPositionsPrefix';
import type { DiagramPanelDependencies } from '../model/DiagramPanelDependencies';

export class DiagramPanels {
  private readonly panels = new Map<string, DiagramPanel>();

  constructor(private readonly dependencies: DiagramPanelDependencies) {}

  async show(target: ConnectionTarget, namespace?: string): Promise<void> {
    const panel = this.panels.get(target.id) ?? this.create(target);
    await panel.show(namespace);
  }

  async forgetPositions(target: Pick<ConnectionTarget, 'key'>): Promise<void> {
    const { storage } = this.dependencies;
    const prefix = diagramPositionsPrefix(target);
    await Promise.all(storage.keys().filter((key) => key.startsWith(prefix)).map((key) => storage.update(key, undefined)));
  }

  private create(target: ConnectionTarget): DiagramPanel {
    const panel = DiagramPanel.create(target, this.dependencies);
    panel.onDidDispose(() => this.panels.delete(target.id));
    this.panels.set(target.id, panel);
    return panel;
  }
}
