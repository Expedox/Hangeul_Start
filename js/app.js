import { initI18n, useLang, t, currentLang, allLanguages } from './i18n.js';
import * as store from './store.js';
import { initAudio } from './audio.js';
import { course, loadContent, lessonOpen, stageOpen } from './content.js';
import { homeView } from './views/map.js';
import { lessonView, finalView } from './views/lesson.js';
import { builderView } from './views/builder.js';
import { reportView, mistakesView, mistakesPractice, statsView, settingsView } from './views/pages.js';

const view = document.getElementById('view');
export const THEMES = ['kids', 'teen', 'adult'];

export function applyTheme() {
  const theme = store.get().theme;
  document.body.dataset.theme = THEMES.includes(theme) ? theme : 'teen';
  const color = getComputedStyle(document.body).getPropertyValue('--accent').trim();
  document.querySelector('meta[name=theme-color]').content = color;
}

function nextLang() {
  const langs = allLanguages();
  return langs[(langs.findIndex(l => l.code === currentLang()) + 1) % langs.length];
}

function renderChrome() {
  document.title = t('app.title');
  const lang = document.getElementById('lang-btn');
  lang.textContent = currentLang().toUpperCase();
  lang.setAttribute('aria-label', `${t('settings.language')}: ${nextLang().name}`);
  document.getElementById('back-btn').setAttribute('aria-label', t('nav.back'));
  document.getElementById('settings-btn').setAttribute('aria-label', t('nav.settings'));
}

async function switchLang(code) {
  await useLang(code, true);
  render();
}

function render() {
  const [name, id] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  renderChrome();
  window.scrollTo(0, 0);

  if (name === 'lesson') {
    const lesson = course.lessons.get(id);
    if (lesson && lessonOpen(lesson)) return lessonView(view, lesson);
  } else if (name === 'final') {
    const stage = course.stages.find(s => s.id === id);
    if (stage && stageOpen(stage) && stage.lessonData.length) return finalView(view, stage);
  } else if (name === 'report') {
    const stage = course.stages.find(s => s.id === id);
    if (stage) return reportView(view, stage);
  } else if (name === 'mistakes') {
    return id === 'practice' ? mistakesPractice(view) : mistakesView(view);
  } else if (name === 'builder') {
    return builderView(view);
  } else if (name === 'stats') {
    return statsView(view);
  } else if (name === 'settings') {
    return settingsView(view, { onLang: switchLang, onTheme: applyTheme, themes: THEMES });
  }
  if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
  homeView(view);
}

async function boot() {
  applyTheme();
  try {
    await Promise.all([initI18n(), loadContent(), initAudio()]);
  } catch (err) {
    document.getElementById('boot-error').hidden = false;
    console.warn(err);
    return;
  }
  document.getElementById('lang-btn').addEventListener('click', () => switchLang(nextLang().code));
  document.getElementById('settings-btn').addEventListener('click', () => { location.hash = '#/settings'; });
  window.addEventListener('hashchange', render);
  render();
}

boot();
