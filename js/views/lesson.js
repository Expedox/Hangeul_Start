import { t, tx } from '../i18n.js';
import { esc } from '../util.js';
import { hasAudio, play } from '../audio.js';
import * as store from '../store.js';
import { buildQuestions } from '../engine.js';
import { setHeader, progressBar } from '../ui.js';
import {
  course, stageOf, passMarkOf, poolUpTo, nextLesson,
  stageItems, stageExerciseTypes
} from '../content.js';
import { runSession, promptCard, doneHtml } from './session.js';

const STEPS = ['cards', 'practice', 'check'];

const steps = active => `<ol class="steps">${STEPS.map(s =>
  `<li class="${s === active ? 'on' : ''}">${esc(t('lesson.' + s))}</li>`).join('')}</ol>`;

function factsHtml(item) {
  const rows = [
    item.sound && [t('lesson.sound'), tx(item.sound)],
    item.meaning && [t('lesson.meaning'), tx(item.meaning)],
    item.reply && [t('lesson.reply'), `${item.reply.hangul} (${tx(item.reply.sound)}): ${tx(item.reply.meaning)}`],
    item.mnemonic && [t('lesson.mnemonic'), tx(item.mnemonic)],
    item.note && [t('lesson.note'), tx(item.note)]
  ].filter(Boolean);
  return `<dl class="facts">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
}

export function lessonView(root, lesson) {
  const stage = stageOf(lesson);
  const pool = poolUpTo(lesson);
  const passMark = passMarkOf(lesson);
  setHeader(tx(lesson.title), '#/');

  function frame(step, html) {
    root.innerHTML = `<div class="learn">${steps(step)}<div data-body></div></div>`;
    const body = root.querySelector('[data-body]');
    body.innerHTML = html ?? '';
    return body;
  }

  // Kurze Erklärung vor den Lernkarten, wenn die Lektion eine hat.
  function intro() {
    const body = frame('cards');
    body.className = 'learn';
    body.innerHTML = `
      <section class="card intro">
        ${tx(lesson.intro).split('\n').filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')}
      </section>
      <button class="btn primary" type="button" data-next>${esc(t('lesson.next'))}</button>`;
    body.querySelector('[data-next]').addEventListener('click', () => cards());
  }

  function cards(i = 0) {
    const item = lesson.items[i];
    const last = i === lesson.items.length - 1;
    const body = frame('cards');
    body.className = 'learn';
    body.innerHTML = `
      ${progressBar(i + 1, lesson.items.length)}
      <p class="counter">${esc(t('ex.progress', { i: i + 1, n: lesson.items.length }))}</p>
      ${promptCard(item, { extra: factsHtml(item) })}
      <div class="row">
        <button class="btn" type="button" data-prev ${i === 0 && !lesson.intro ? 'disabled' : ''}>${esc(t('lesson.prev'))}</button>
        <button class="btn primary" type="button" data-next>${esc(last ? t('lesson.startPractice') : t('lesson.next'))}</button>
      </div>`;
    body.querySelector('[data-play]')?.addEventListener('click', () => play(item.audio));
    body.querySelector('[data-prev]').addEventListener('click', () => (i === 0 ? intro() : cards(i - 1)));
    body.querySelector('[data-next]').addEventListener('click', () => (last ? practice() : cards(i + 1)));
    if (hasAudio(item.audio)) play(item.audio);
  }

  function practice() {
    const count = lesson.practice?.questions ?? Math.min(lesson.items.length * 2, 12);
    runSession(frame('practice'), {
      questions: buildQuestions(lesson.items, lesson.exercises, count, pool),
      repeatWrong: true,
      onDone: () => {
        const body = frame('practice', doneHtml({
          emoji: '💪',
          title: t('result.practiceDone'),
          lead: t('result.checkInfo', { pct: Math.round(passMark * 100) }),
          buttons: `<button class="btn primary" type="button" data-check>${esc(t('lesson.startCheck'))}</button>
            <button class="btn" type="button" data-again>${esc(t('lesson.cards'))}</button>`
        }));
        body.querySelector('[data-check]').addEventListener('click', check);
        body.querySelector('[data-again]').addEventListener('click', () => (lesson.intro ? intro() : cards()));
      }
    });
  }

  function check() {
    const count = lesson.check?.questions ?? Math.min(lesson.items.length * 2, 10);
    runSession(frame('check'), {
      questions: buildQuestions(lesson.items, lesson.exercises, count, pool),
      onDone: ({ right, total }) => {
        const score = total ? right / total : 0;
        store.completeLesson(lesson.id, score, passMark);
        const passed = score >= passMark;
        const next = nextLesson(lesson);
        const forward = !passed ? ''
          : next ? `<a class="btn primary" href="#/lesson/${esc(next.id)}">${esc(t('result.nextLesson'))}</a>`
          : `<a class="btn primary" href="#/final/${esc(stage.id)}">🎓 ${esc(t('map.final'))}</a>`;
        root.innerHTML = doneHtml({
          emoji: passed ? '🏆' : '🔁',
          title: passed ? t('result.passed') : t('result.failed'),
          lead: t('result.score', { right, total, pct: Math.round(score * 100) }),
          extra: passed ? '' : `<p class="hint">${esc(t('result.need', { pct: Math.round(passMark * 100) }))}</p>`,
          buttons: `${forward}
            <button class="btn${passed ? '' : ' primary'}" type="button" data-retry>${esc(passed ? t('result.retry') : t('lesson.practice'))}</button>
            <a class="btn" href="#/">${esc(t('result.toMap'))}</a>`
        });
        root.querySelector('[data-retry]').addEventListener('click', () => (passed ? check() : practice()));
      }
    });
  }

  if (lesson.intro) intro(); else cards();
}

// Stufenabschluss, oder Einstufung, wenn noch nicht alle Lektionen geschafft sind.
export function finalView(root, stage) {
  setHeader(`${t('map.stage', { n: stage.number })}: ${t('map.final')}`, '#/');
  const count = stage.finalQuestions ?? course.finalQuestions;
  runSession(root, {
    questions: buildQuestions(stageItems(stage), stageExerciseTypes(stage), count, [...course.items.values()]),
    onDone: ({ right, total }) => {
      store.completeStage(stage, right, total, course.passMark);
      location.hash = `#/report/${stage.id}`;
    }
  });
}
