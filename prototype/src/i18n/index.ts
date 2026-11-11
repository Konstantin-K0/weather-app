import en from './locales/en.ts';
import uk from './locales/uk.ts';
import cs from './locales/cs.ts';
import ru from './locales/ru.ts';
import { languageNames, type Language, type MessageKey, type ParametersFor, type StaticKey, type Translations } from './types.ts';

export { languageNames };
export type { Language };
export const dictionaries: Readonly<Record<Language, Translations>> = { en, uk, cs, ru };
export const languageKey = 'weather-v2-language';
type PreferenceStore = Pick<Storage, 'getItem' | 'setItem'>;

export function isLanguage(code: string | null): code is Language {
  return !!code && Object.hasOwn(dictionaries, code);
}

export function detectLanguage(languages: readonly string[], storage?: PreferenceStore): Language {
  try {
    const saved = (storage ?? globalThis.localStorage)?.getItem(languageKey) ?? null;
    if (isLanguage(saved)) return saved;
  } catch { /* Language detection still works without storage. */ }
  for (const tag of languages) {
    const code = tag.toLowerCase().split('-')[0] ?? '';
    if (isLanguage(code)) return code;
  }
  return 'en';
}

let language = detectLanguage(globalThis.navigator?.languages ?? []);
export const getLanguage = () => language;

export function setLanguage(value: Language, storage?: PreferenceStore): void {
  language = value;
  try { (storage ?? globalThis.localStorage)?.setItem(languageKey, value); }
  catch { /* The selection still works during the current visit. */ }
}

export function t<Key extends MessageKey>(
  key: Key, ...args: ParametersFor<Key> extends never ? [] : [Record<ParametersFor<Key>, string | number>]
): string {
  const template = dictionaries[language][key] ?? en[key];
  const values = args[0] as Record<string, string | number> | undefined;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? `{${name}}`));
}

export function translateStatic(root: ParentNode): void {
  for (const [selector, attribute] of [['data-t', 'textContent'], ['data-t-label', 'aria-label'], ['data-t-placeholder', 'placeholder']] as const) {
    for (const element of root.querySelectorAll(`[${selector}]`)) {
      const key = element.getAttribute(selector) as StaticKey;
      if (!Object.hasOwn(en, key)) throw new Error(`Unknown translation key: ${key}`);
      if (attribute === 'textContent') element.textContent = t(key);
      else element.setAttribute(attribute, t(key));
    }
  }
}
