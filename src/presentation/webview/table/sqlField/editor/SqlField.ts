import { acceptCompletion, autocompletion } from '@codemirror/autocomplete';
import type { CompletionSource } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { classHighlighter } from '@lezer/highlight';
import type { DriverId } from '../../../../../domain/driver/model/DriverId';
import { createElement } from '../../../shared/dom/createElement';
import { createSqlLanguage } from '../language/createSqlLanguage';

interface SqlFieldOptions {
  readonly className: string;
  readonly ariaLabel: string;
  readonly placeholder?: string;
  readonly wrapsLines: boolean;
  readonly submitKey: string;
  readonly completions: CompletionSource;
  onChange(value: string): void;
  onSubmit(): void;
}

export class SqlField {
  readonly element: HTMLElement;
  private readonly view: EditorView;
  private readonly language = new Compartment();

  constructor(options: SqlFieldOptions) {
    this.element = createElement('div', { className: options.className });
    this.view = new EditorView({
      parent: this.element,
      state: EditorState.create({ extensions: [this.language.of([]), createExtensions(options)] }),
    });
  }

  get value(): string {
    return this.view.state.doc.toString();
  }

  set value(text: string) {
    if (text !== this.value) {
      this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: text } });
    }
  }

  setDriver(kind: DriverId): void {
    this.view.dispatch({ effects: this.language.reconfigure(createSqlLanguage(kind)) });
  }
}

function createExtensions(options: SqlFieldOptions): Extension {
  return [
    EditorView.cspNonce.of(document.body.dataset.styleNonce ?? ''),
    history(),
    syntaxHighlighting(classHighlighter),
    autocompletion({ override: [options.completions] }),
    placeholder(options.placeholder ?? ''),
    options.wrapsLines ? EditorView.lineWrapping : [],
    EditorView.contentAttributes.of({ 'aria-label': options.ariaLabel, spellcheck: 'false' }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        options.onChange(update.state.doc.toString());
      }
    }),
    Prec.highest(keymap.of([{ key: 'Tab', run: acceptCompletion }])),
    Prec.high(
      keymap.of([
        {
          key: options.submitKey,
          run: () => {
            options.onSubmit();
            return true;
          },
        },
      ]),
    ),
    keymap.of([...defaultKeymap, ...historyKeymap]),
  ];
}
