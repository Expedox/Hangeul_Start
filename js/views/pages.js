import { t, tx, currentLang, allLanguages } from '../i18n.js';
import { esc } from '../util.js';
import * as store from '../store.js';
import { buildQuestions, EXERCISES } from '../engine.js';
import { course, stageProgress } from '../content.js';
import { setHeader, progressBar } from '../ui.js';
import { runSession, doneHtml } from './session.js';

const LETTERS = ['vowel', 'consonant', 'syllable'];
const LEARNED_BOX = 2;
const PRACTICE_SIZE = 10;
const GOALS = [10, 20, 30, 50];

function gradeKey(score) {
  if (score >= 0.98) return 'grade.1';
  if (score >= 0.9) return 'grade.2';
  if (score >= 0.85) return 'grade.3';
  if (score >= course.passMark) return 'grade.4';
  return 'grade.5';
}

const localDate = day => new Date(...day.split('-').map((v, i) => (i === 1 ? v - 1 : +v)))
  .toLocaleDateString(currentLang());

// Schwierig = schon mal falsch und noch nicht sicher.
export function difficultItems() {
  return [...course.items.values()]
    .map(item => ({ item, s: store.itemStats(item.id) }))
    .filter(({ s }) => s && s.wrong > 0 && s.box < 3)
    .sort((a, b) => a.s.box - b.s.box || b.s.wrong - a.s.wrong);
}

const itemList = entries => `<ul class="wordlist">${entries.map(({ item, s }) => `
  <li>
    <span class="ko" lang="ko">${esc(item.hangul)}</span>
    <span class="term">${esc(tx(item.sound))}${item.meaning ? ` · ${esc(tx(item.meaning))}` : ''}</span>
    <span class="trans">${esc(t('mistakes.wrong', { n: s.wrong }))}</span>
  </li>`).join('')}</ul>`;

export function reportView(root, stage) {
  const s = store.get().stages[stage.id];
  if (!s?.report) { location.hash = '#/'; return; }
  setHeader(t('report.title'), '#/');
  const { right, total, date } = s.report;
  const score = total ? right / total : 0;
  const passed = score >= course.passMark;
  root.innerHTML = `
    <div class="learn">
      <article class="card report${passed ? ' passed' : ''}">
        <p class="kicker">${esc(t('report.title'))}</p>
        <h2>${esc(t('map.stage', { n: stage.number }))}: ${esc(tx(stage.title))}</h2>
        <dl class="facts">
          <dt>${esc(t('report.date'))}</dt><dd>${esc(localDate(date))}</dd>
          <dt>${esc(t('report.score'))}</dt><dd>${esc(t('result.score', { right, total, pct: Math.round(score * 100) }))}</dd>
          <dt>${esc(t('report.grade'))}</dt><dd class="grade">${esc(t(gradeKey(score)))}</dd>
          <dt>${esc(t('report.best'))}</dt><dd>${Math.round((s.best || 0) * 100)} %</dd>
        </dl>
        <p>${esc(passed ? t('report.passedText') : t('report.failedText', { pct: Math.round(course.passMark * 100) }))}</p>
      </article>
      <div class="stack">
        <a class="btn primary" href="#/">${esc(t('result.toMap'))}</a>
        <a class="btn" href="#/final/${esc(stage.id)}">${esc(t('result.retry'))}</a>
      </div>
    </div>`;
}

export function mistakesView(root) {
  setHeader(t('mistakes.title'), '#/');
  const list = difficultItems();
  root.innerHTML = `
    <p class="lead">${esc(t('mistakes.intro'))}</p>
    ${list.length ? itemList(list) : `<p class="empty">${esc(t('mistakes.empty'))}</p>`}
    <div class="stack" style="margin-top:16px"><a class="btn primary" href="#/mistakes/practice">${esc(t('mistakes.practice'))}</a></div>`;
}

// Wiederholung über alles bereits Gesehene, gewichtet nach Unsicherheit.
export function mistakesPractice(root) {
  setHeader(t('mistakes.practice'), '#/mistakes');
  const all = [...course.items.values()];
  const seen = all.filter(i => store.itemStats(i.id));
  if (!seen.length) {
    root.innerHTML = `<p class="empty">${esc(t('mistakes.none'))}</p>`;
    return;
  }
  const focus = seen
    .map(i => ({ i, w: store.itemWeight(i.id) * Math.random() }))
    .sort((a, b) => b.w - a.w)
    .slice(0, PRACTICE_SIZE)
    .map(e => e.i);
  runSession(root, {
    questions: buildQuestions(focus, Object.keys(EXERCISES), PRACTICE_SIZE, all),
    repeatWrong: true,
    onDone: ({ right, total }) => {
      root.innerHTML = doneHtml({
        emoji: '⭐',
        title: t('result.practiceDone'),
        lead: t('result.score', { right, total, pct: total ? Math.round((right / total) * 100) : 0 }),
        buttons: `<a class="btn primary" href="#/">${esc(t('result.toMap'))}</a>
          <a class="btn" href="#/mistakes">📒 ${esc(t('mistakes.title'))}</a>`
      });
    }
  });
}

export function statsView(root) {
  setHeader(t('stats.title'), '#/');
  const st = store.get();
  const answers = st.totals.right + st.totals.wrong;
  const accuracy = answers ? Math.round((st.totals.right / answers) * 100) : 0;
  let letters = 0, words = 0;
  for (const item of course.items.values()) {
    if ((store.itemStats(item.id)?.box ?? 0) < LEARNED_BOX) continue;
    if (LETTERS.includes(item.type)) letters++; else words++;
  }
  const stat = (big, label) => `<div class="stat"><span class="stat-big">${esc(big)}</span><span>${esc(label)}</span></div>`;
  const difficult = difficultItems().slice(0, 10);

  root.innerHTML = `
    <div class="stat-grid">
      ${stat(`🎯 ${accuracy} %`, t('stats.accuracy'))}
      ${stat(`✍️ ${answers}`, t('stats.answers'))}
      ${stat(`🔥 ${store.currentStreak()}`, t('stats.streak'))}
      ${stat(`🔤 ${letters}`, t('stats.letters'))}
      ${stat(`💬 ${words}`, t('stats.words'))}
      ${stat(`📅 ${store.todayCount()}/${st.goal}`, t('stats.today'))}
    </div>
    <h3 class="section">${esc(t('stats.stages'))}</h3>
    <ul class="stage-bars">${course.stages.map(s => {
      const { done, total } = stageProgress(s);
      return `<li><span>${esc(t('map.stage', { n: s.number }))}</span>${progressBar(done, total)}
        <span class="hint" style="margin:0">${total ? Math.round((done / total) * 100) : 0} %</span></li>`;
    }).join('')}</ul>
    <h3 class="section">${esc(t('stats.difficult'))}</h3>
    ${difficult.length ? itemList(difficult) : `<p class="empty">${esc(t('mistakes.empty'))}</p>`}`;
}

export function settingsView(root, { onLang, onTheme, themes }) {
  setHeader(t('settings.title'), '#/');
  const st = store.get();
  const opt = (value, label, selected) => `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;
  root.innerHTML = `
    <section class="card">
      <label class="field"><span>${esc(t('settings.language'))}</span>
        <select data-lang>${allLanguages().map(l => opt(l.code, l.name, l.code === currentLang())).join('')}</select>
      </label>
      <label class="field"><span>${esc(t('settings.theme'))}</span>
        <select data-look>${themes.map(th => opt(th, t('theme.' + th), th === st.theme)).join('')}</select>
      </label>
      <label class="field"><span>${esc(t('settings.goal'))}</span>
        <select data-goal>${GOALS.map(g => opt(g, g, g === st.goal)).join('')}</select>
      </label>
    </section>
    <section class="card">
      <h2>${esc(t('settings.reset'))}</h2>
      <div class="stack">
        <button class="btn danger" type="button" data-reset>${esc(t('settings.reset'))}</button>
        <p class="toast ok" data-msg hidden></p>
      </div>
    </section>`;
  root.querySelector('[data-lang]').addEventListener('change', e => onLang(e.target.value));
  root.querySelector('[data-look]').addEventListener('change', e => { store.setTheme(e.target.value); onTheme(); });
  root.querySelector('[data-goal]').addEventListener('change', e => store.setGoal(Number(e.target.value)));
  root.querySelector('[data-reset]').addEventListener('click', () => {
    if (!confirm(t('settings.resetConfirm'))) return;
    store.reset();
    const msg = root.querySelector('[data-msg]');
    msg.textContent = t('settings.resetDone');
    msg.hidden = false;
  });
}
