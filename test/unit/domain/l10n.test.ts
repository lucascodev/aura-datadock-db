import { afterEach, describe, expect, it } from 'vitest';
import { l10n, useL10nCatalog } from '../../../src/domain/i18n/translation/l10n';

describe('l10n', () => {
  afterEach(() => useL10nCatalog({ locale: 'en' }));

  it('falls back to the English message', () => {
    expect(l10n.t('Hello {0}', 'Ana')).toBe('Hello Ana');
    expect(l10n.locale()).toBe('en');
  });

  it('uses the translation of the active catalog', () => {
    useL10nCatalog({ locale: 'pt-br', messages: { 'Hello {0}': 'Olá {0}' } });
    expect(l10n.t('Hello {0}', 'Ana')).toBe('Olá Ana');
    expect(l10n.locale()).toBe('pt-br');
  });

  it('keeps a message that has no translation', () => {
    useL10nCatalog({ locale: 'pt-br', messages: {} });
    expect(l10n.t('Not translated')).toBe('Not translated');
  });

  it('accepts numbers, repeated placeholders and text that looks like a replacement pattern', () => {
    expect(l10n.t('{0} of {1}, {0}', 1, 2)).toBe('1 of 2, 1');
    expect(l10n.t('Value {0}', '$& $1')).toBe('Value $& $1');
  });

  it('leaves a placeholder without an argument visible', () => {
    expect(l10n.t('Missing {0}')).toBe('Missing {0}');
  });
});
