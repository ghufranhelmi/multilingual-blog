import { ui, defaultLang, rtlLanguages, type Lang, type UIKey } from './ui';

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as Lang;
  return defaultLang;
}

export function t(lang: Lang, key: UIKey): string {
  return ui[lang][key] || ui[defaultLang][key];
}

export function getSlugFromId(id: string): string {
  const parts = id.split('/');
  parts.shift();
  return parts.join('/');
}

export function getLangFromId(id: string): Lang {
  const lang = id.split('/')[0];
  if (lang in ui) return lang as Lang;
  return defaultLang;
}

export function langPrefix(lang: Lang): string {
  return `/${lang}`;
}

export function isRTL(lang: Lang): boolean {
  return rtlLanguages.includes(lang);
}

export function localeForLang(lang: Lang): string {
  const map: Record<Lang, string> = {
    en: 'en-US',
    zh: 'zh-CN',
    es: 'es-ES',
    ar: 'ar-SA',
    id: 'id-ID',
    pt: 'pt-PT',
    fr: 'fr-FR',
    ja: 'ja-JP',
    ru: 'ru-RU',
    de: 'de-DE',
    it: 'it-IT',
    ko: 'ko-KR',
  };
  return map[lang];
}

export const allLangs = Object.keys(ui) as Lang[];
