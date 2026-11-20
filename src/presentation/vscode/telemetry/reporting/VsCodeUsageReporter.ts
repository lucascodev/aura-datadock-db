import type * as vscode from 'vscode';
import type { UsageEvent } from '../../../../application/telemetry/model/UsageEvent';
import type { UsageReporter } from '../../../../application/telemetry/ports/UsageReporter';

export class VsCodeUsageReporter implements UsageReporter {
  constructor(
    private readonly logger: vscode.TelemetryLogger,
    private readonly isEnabled: () => boolean,
  ) {}

  report(event: UsageEvent): void {
    if (!this.isEnabled()) {
      return;
    }
    const { name, ...properties } = event;
    this.logger.logUsage(name, properties);
  }
}
