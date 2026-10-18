import { getJSON } from './util.js';
import * as store from './store.js';

let strings = {};
let lang = 'de';
let languages = [];

export async function initI18n() {
  languages = await getJSON('lang/languages.json');
  const codes = languages.map(l => l.code);
  const saved = store.get().lang;
  const browser = (navigator.languages || [navigator.language || ''])
    .map(l => l.slice(0, 2).toLowerCase())
    .find(l => codes.includes(l));
  await useLang(codes.includes(saved) ? saved : browser || codes[0]);
}

export async function useLang(code, remember = false) {
  strings = await getJSON(`lang/${code}.json`);
  lang = code;
  document.documentElement.lang = code;
  if (remember) store.setLang(code);
}

export const currentLang = () => lang;
export const allLanguages = () => languages;

// Oberflächentext mit Platzhaltern: t('map.stage', { n: 1 })
export function t(key, vars = {}) {
  const s = strings[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Inhaltstext aus den Daten: { de: '…', en: '…' }
export function tx(obj) {
  if (obj == null || typeof obj === 'string') return obj ?? '';
  return obj[lang] ?? obj.en ?? obj.de ?? '';
}
