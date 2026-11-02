import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';

export type Locale = 'zh-CN' | 'zh-TW' | 'en';

export const LOCALES: { code: Locale; label: string; htmlLang: string }[] = [
  { code: 'zh-CN', label: '简体中文', htmlLang: 'zh-CN' },
  { code: 'zh-TW', label: '繁體中文', htmlLang: 'zh-TW' },
  { code: 'en', label: 'English', htmlLang: 'en' },
];

export const LEGACY_LOCALE_MAP: Record<string, Locale> = {
  zh_cn: 'zh-CN',
  zh_tw: 'zh-TW',
  en: 'en',
};

export const STORAGE_KEY = 'cc-oldstyle-locale';

function flatten(source: Record<string, Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [category, messages] of Object.entries(source)) {
    for (const [key, value] of Object.entries(messages)) {
      out[`${category}.${key}`] = value;
    }
  }
  return out;
}

const zhCNDict = flatten(zhCN as Record<string, Record<string, string>>);
const zhTWDict = flatten(zhTW as Record<string, Record<string, string>>);

export function resolveInitialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'zh-CN' || stored === 'zh-TW' || stored === 'en') return stored;

  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang && LEGACY_LOCALE_MAP[urlLang]) return LEGACY_LOCALE_MAP[urlLang];

  const nav = navigator.language || 'zh-CN';
  if (/^zh-(TW|HK|MO|Hant)/i.test(nav)) return 'zh-TW';
  if (/^zh/i.test(nav)) return 'zh-CN';
  return 'en';
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCNDict,
    'zh-TW': zhTWDict,
    en: {},
  },
  missingWarn: false,
  fallbackWarn: false,
});

export function t(key: string, named?: Record<string, unknown>, fallback?: string): string {
  const fullKey = key.includes('.') ? key : `common.${key}`;
  const value = i18n.global.t(fullKey, named ?? {}, { missingWarn: false }) as string;
  if (!value || value === fullKey) return fallback ?? key;
  return value;
}

export function te(key: string): boolean {
  const fullKey = key.includes('.') ? key : `common.${key}`;
  return i18n.global.te(fullKey);
}

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  const meta = LOCALES.find((l) => l.code === locale);
  document.documentElement.lang = meta?.htmlLang ?? 'zh-CN';
}

export function currentLocale(): Locale {
  return i18n.global.locale.value as Locale;
}

export function localePrefix(): string {
  const locale = currentLocale();
  return locale === 'en' ? '' : `/${locale.toLowerCase()}`;
}

export function regionName(name: string | null | undefined): string {
  if (!name) return '';
  const fullKey = `Region.${name}`;
  const value = i18n.global.t(fullKey, {}, { missingWarn: false }) as string;
  return !value || value === fullKey ? name : value;
}

