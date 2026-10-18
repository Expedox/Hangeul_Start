import { t, tx } from '../i18n.js';
import { esc } from '../util.js';
import * as store from '../store.js';
import { setHeader, goalRing, cta, progressBar } from '../ui.js';
import {
  course, stageOpen, stagePassed, lessonOpen, lessonPassed, stageProgress
} from '../content.js';
import { difficultItems } from './pages.js';

function stageState(stage) {
  if (stagePassed(stage.id)) return 'done';
  if (!stageOpen(stage)) return 'locked';
  return stage.lessonData.length ? 'open' : 'soon';
}

function lessonTile(lesson) {
  const done = lessonPassed(lesson.id);
  const open = lessonOpen(lesson);
  const emoji = done ? '✅' : open ? '▶️' : '🔒';
  const inner = `
    <span class="emoji" aria-hidden="true">${emoji}</span>
    <span class="name">${esc(tx(lesson.title))}</span>
    <span class="small">${esc(t('map.lesson', { n: lesson.index + 1 }))}</span>`;
  if (!open) return `<div class="tile locked">${inner}</div>`;
  const current = !done ? ' current' : '';
  return `<a class="tile${current}" href="#/lesson/${esc(lesson.id)}">${inner}</a>`;
}

function stageSection(stage) {
  const state = stageState(stage);
  const { done, total } = stageProgress(stage);
  const best = store.get().stages[stage.id]?.best;

  let action = '';
  if (state === 'done') {
    action = `<a class="btn" href="#/report/${esc(stage.id)}">📜 ${esc(t('map.report'))}</a>`;
  } else if (state === 'open') {
    action = done === total
      ? `<a class="btn primary" href="#/final/${esc(stage.id)}">🎓 ${esc(t('map.final'))}</a>`
      : `<a class="btn" href="#/final/${esc(stage.id)}">⏭️ ${esc(t('map.placement'))}</a>`;
  }

  return `
    <section class="stage stage-${stage.number} is-${state}">
      <h2><span class="badge">${esc(t('map.stage', { n: stage.number }))}</span> ${esc(tx(stage.title))}
        <span class="state">${esc(t('map.' + state))}</span></h2>
      <p class="hint">${esc(tx(stage.subtitle))}${total ? ` · ${esc(t('map.progress', { done, total }))}` : ''}${best != null ? ` · ${esc(t('map.best', { pct: Math.round(best * 100) }))}` : ''}</p>
      ${total ? progressBar(done, total) : ''}
      ${total && state !== 'locked' ? `<div class="grid lessons">${stage.lessonData.map(lessonTile).join('')}</div>` : ''}
      ${state !== 'locked' && stage.tools?.includes('builder') ? `<a class="btn" href="#/builder">🧩 ${esc(t('builder.title'))}</a>` : ''}
      ${action}
    </section>`;
}

export function homeView(root) {
  setHeader(t('app.title'));
  const st = store.get();
  const today = store.todayCount();
  const streak = store.currentStreak();
  const learned = Object.values(st.items).filter(i => i.box >= 2).length;
  const tricky = difficultItems().length;

  root.innerHTML = `
    <p class="lead">${esc(today >= st.goal ? t('home.goalDone') : today ? t('home.goalLeft', { n: st.goal - today }) : t('home.ready'))}</p>
    <div class="stats-row">
      <div class="stat">${goalRing(today, st.goal)}<span>${esc(t('home.goal'))}<br><b>${Math.min(today, st.goal)}/${st.goal}</b></span></div>
      <div class="stat"><span class="stat-big">🔥 ${streak}</span><span>${esc(t('stats.streak'))}</span></div>
      <div class="stat"><span class="stat-big">✅ ${learned}</span><span>${esc(t('home.learned'))}</span></div>
    </div>
    ${tricky ? cta('#/mistakes', '📒', t('mistakes.title'), t('home.tricky', { n: tricky }), 'soft') : ''}
    <h3 class="section">${esc(t('map.title'))}</h3>
    ${course.stages.map(stageSection).join('')}
    <div class="row">
      ${tricky ? '' : `<a class="btn" href="#/mistakes">📒 ${esc(t('mistakes.title'))}</a>`}
      <a class="btn" href="#/stats">📊 ${esc(t('stats.title'))}</a>
    </div>`;
}
