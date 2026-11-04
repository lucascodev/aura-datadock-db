import { vi } from 'vitest';

type MessageListener = (message: unknown) => unknown;

export interface FakeWebviewPanel {
  title: string;
  posted: unknown[];
  isDisposed: boolean;
  receive(message: unknown): Promise<void>;
  close(): void;
}

export const createdPanels: FakeWebviewPanel[] = [];

export const ViewColumn = { Active: -1, Beside: -2 };

export const env = { language: 'en' };

export const l10n: { bundle?: Record<string, string> } = {};

export const Uri = {
  joinPath: (...parts: unknown[]) => ({ path: parts.join('/') }),
  file: (path: string) => ({ fsPath: path }),
};

export const workspace = {
  fs: { writeFile: vi.fn(async () => undefined) },
};

export const window = {
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  setStatusBarMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  createWebviewPanel: vi.fn((_type: string, title: string) => {
    let messageListener: MessageListener | undefined;
    const disposeListeners: (() => void)[] = [];

    const fake: FakeWebviewPanel = {
      title,
      posted: [],
      isDisposed: false,
      receive: async (message) => {
        await messageListener?.(message);
      },
      close: () => {
        fake.isDisposed = true;
        disposeListeners.forEach((listener) => listener());
      },
    };
    createdPanels.push(fake);

    return {
      get title() {
        return fake.title;
      },
      set title(value: string) {
        fake.title = value;
      },
      reveal: vi.fn(),
      dispose: () => fake.close(),
      onDidDispose: (listener: () => void) => {
        disposeListeners.push(listener);
      },
      webview: {
        html: '',
        cspSource: 'test-source',
        asWebviewUri: (uri: unknown) => uri,
        postMessage: async (message: unknown) => {
          fake.posted.push(message);
          return true;
        },
        onDidReceiveMessage: (listener: MessageListener) => {
          messageListener = listener;
        },
      },
    };
  }),
};
