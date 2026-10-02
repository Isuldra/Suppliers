// @vitest-environment node
import { describe, expect, it } from 'vitest';
import no from '../src/renderer/locales/workspace/no.json';
import da from '../src/renderer/locales/workspace/da.json';
import se from '../src/renderer/locales/workspace/se.json';
import fi from '../src/renderer/locales/workspace/fi.json';
import en from '../src/renderer/locales/workspace/en.json';
import { initNorwegian } from './i18nTestSetup';

function keys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' ? keys(child, `${prefix}${key}.`) : [`${prefix}${key}`]
  );
}

describe('workspace translations', () => {
  it('cover every Norwegian key in every language', () => {
    const expected = keys(no).sort();
    for (const [language, messages] of Object.entries({ da, se, fi, en })) {
      expect(keys(messages).sort(), language).toEqual(expected);
    }
  });

  it('resolves plurals, including a count of two in Swedish', async () => {
    const i18n = await initNorwegian();
    expect(i18n.t('workspace.review.send', { count: 1 })).toBe('Send 1 purring');
    expect(i18n.t('workspace.review.send', { count: 2 })).toBe('Send 2 purringer');
    await i18n.changeLanguage('se');
    expect(i18n.t('workspace.review.send', { count: 2 })).toBe('Skicka 2 påminnelser');
    expect(i18n.t('workspace.days.Mandag')).toBe('Måndag');
    await i18n.changeLanguage('fi');
    expect(i18n.t('workspace.footer.send', { count: 3 })).toBe('Lähetä 3 muistutusta →');
  });
});
