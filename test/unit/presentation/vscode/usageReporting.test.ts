import type * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';
import type { UsageSink } from '../../../../src/application/telemetry/ports/UsageSink';
import { createTelemetrySender } from '../../../../src/presentation/vscode/telemetry/reporting/createTelemetrySender';
import { VsCodeUsageReporter } from '../../../../src/presentation/vscode/telemetry/reporting/VsCodeUsageReporter';

function createLogger() {
  const logUsage = vi.fn();
  return { logger: { logUsage } as unknown as vscode.TelemetryLogger, logUsage };
}

function createSink() {
  const send = vi.fn();
  const sink: UsageSink = { send };
  return { sink, send };
}

describe('VsCodeUsageReporter', () => {
  it('logs the event name with the other fields as data', () => {
    const { logger, logUsage } = createLogger();

    new VsCodeUsageReporter(logger, () => true).report({ name: 'connection.opened', driver: 'postgres', source: 'docker', ssh: false, remote: false });

    expect(logUsage).toHaveBeenCalledWith('connection.opened', { driver: 'postgres', source: 'docker', ssh: false, remote: false });
  });

  it('sends nothing while the extension setting is off', () => {
    const { logger, logUsage } = createLogger();

    new VsCodeUsageReporter(logger, () => false).report({ name: 'activated' });

    expect(logUsage).not.toHaveBeenCalled();
  });
});

describe('createTelemetrySender', () => {
  it('removes the extension id that VS Code puts before the event name', () => {
    const { sink, send } = createSink();

    createTelemetrySender(sink).sendEventData('lucascodev.aura-datadock-db/command.used', { command: 'showDiagram' });

    expect(send).toHaveBeenCalledWith('command.used', { command: 'showDiagram' });
  });

  it('sends only the kind of an error, never its message', () => {
    const { sink, send } = createSink();

    createTelemetrySender(sink).sendErrorData(new TypeError('password=secret at /home/lucas'));

    expect(send).toHaveBeenCalledWith('error', { kind: 'TypeError' });
  });
});
