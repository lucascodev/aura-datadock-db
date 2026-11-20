import * as vscode from 'vscode';
import type { UsageReporter } from '../../../application/telemetry/ports/UsageReporter';
import { PostHogSink } from '../../../infrastructure/telemetry/posthog/PostHogSink';
import { TELEMETRY_SETTING } from '../../../presentation/vscode/constants/telemetrySetting';
import { showTelemetryNotice } from '../../../presentation/vscode/telemetry/notice/showTelemetryNotice';
import { createTelemetrySender } from '../../../presentation/vscode/telemetry/reporting/createTelemetrySender';
import { VsCodeUsageReporter } from '../../../presentation/vscode/telemetry/reporting/VsCodeUsageReporter';
import type { HostEnvironment } from '../model/HostEnvironment';

const POSTHOG_HOST = 'https://eu.i.posthog.com';
const POSTHOG_PROJECT_KEY: string = '';
const SILENT_REPORTER: UsageReporter = { report: () => undefined };

export function createUsageReporter(host: HostEnvironment): UsageReporter {
  const { extension, config } = host;
  if (!POSTHOG_PROJECT_KEY || extension.extensionMode !== vscode.ExtensionMode.Production) {
    return SILENT_REPORTER;
  }

  const sink = new PostHogSink({ host: POSTHOG_HOST, projectKey: POSTHOG_PROJECT_KEY, distinctId: vscode.env.machineId });
  const logger = vscode.env.createTelemetryLogger(createTelemetrySender(sink), {
    ignoreUnhandledErrors: true,
    additionalCommonProperties: { editor: vscode.env.appName },
  });
  extension.subscriptions.push(logger);

  const isEnabled = () => config().get<boolean>(TELEMETRY_SETTING, true);
  if (logger.isUsageEnabled && isEnabled()) {
    void showTelemetryNotice(extension, config);
  }
  return new VsCodeUsageReporter(logger, isEnabled);
}
