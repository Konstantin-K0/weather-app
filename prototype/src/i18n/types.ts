import type english from './locales/en.ts';

export const languageNames = { uk: 'Українська', en: 'English', cs: 'Čeština', ru: 'Русский' } as const;
export type Language = keyof typeof languageNames;
export type MessageKey = keyof typeof english;
export type Translations = Record<MessageKey, string>;

type Placeholders<Text extends string> =
  Text extends `${string}{${infer Name}}${infer Rest}` ? Name | Placeholders<Rest> : never;
export type ParametersFor<Key extends MessageKey> = Placeholders<(typeof english)[Key]>;
export type StaticKey = { [Key in MessageKey]: ParametersFor<Key> extends never ? Key : never }[MessageKey];
