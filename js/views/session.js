import { t, tx } from '../i18n.js';
import { esc } from '../util.js';
import { recordAnswer } from '../store.js';
import { hasAudio, play } from '../audio.js';
import { reshuffle } from '../engine.js';
import { compose } from '../hangul.js';
import { progressBar } from '../ui.js';

const AUTO_NEXT_MS = 800;

// Lange Texte (Sätze) bekommen eine kleinere Schrift.
const sizeClass = text => {
  const n = [...(text || '')].length;
  return n > 8 ? ' xl' : n > 3 ? ' long' : '';
};

const speakBtn = item => hasAudio(item.audio)
  ? `<button class="speak" type="button" data-play aria-label="${esc(t('ex.play'))}">🔊</button>` : '';

export function promptCard(item, { mode = 'hangul', extra = '' } = {}) {
  const sign = item.type === 'sign' ? ' sign' : '';
  if (mode === 'audio') {
    return `<div class="prompt-card">
      ${hasAudio(item.audio)
        ? `<button class="listen" type="button" data-play aria-label="${esc(t('ex.play'))}">🔊</button>`
        : `<span class="listen missing" aria-hidden="true">🔇</span><p class="hint">${esc(t('ex.noAudio', { sound: tx(item.sound) }))}</p>`}
    </div>`;
  }
  if (mode === 'meaning') {
    return `<div class="prompt-card"><span class="meaning">${esc(tx(item.meaning))}</span></div>`;
  }
  if (mode === 'sound') {
    return `<div class="prompt-card">${speakBtn(item)}<span class="meaning">${esc(tx(item.sound))}</span></div>`;
  }
  if (mode === 'dialog') {
    return `<div class="prompt-card dialog">${speakBtn(item)}
      <span class="bubble" lang="ko">${esc(item.hangul)}</span>
      <span class="hint">${esc(tx(item.sound))}</span>
    </div>`;
  }
  return `<div class="prompt-card${sign}">
    ${speakBtn(item)}
    <span class="hangul${sizeClass(item.hangul)}" lang="ko">${esc(item.hangul)}</span>
    ${extra}
  </div>`;
}

function choiceHtml(q) {
  const cls = q.korean ? (q.big ? ' ko big' : ' ko') : '';
  return `<div class="options${cls}">
    ${q.options.map((o, i) => `<button class="btn option" type="button" data-i="${i}"${q.korean ? ' lang="ko"' : ''}>${esc(o.text)}</button>`).join('')}
  </div>`;
}

function buildHtml(q) {
  return `
    <div class="build-preview${q.build === 'syllable' ? ' syllable' : ''}" lang="ko" data-preview>&nbsp;</div>
    <div class="tiles-row" data-tiles>
      ${q.tiles.map(tile => `<button class="btn piece" type="button" data-tile="${tile.id}" lang="ko">${esc(tile.text)}</button>`).join('')}
    </div>
    <div class="row">
      <button class="btn" type="button" data-undo>${esc(t('ex.undo'))}</button>
      <button class="btn primary" type="button" data-check disabled>${esc(t('ex.checkAnswer'))}</button>
    </div>`;
}

const previewText = (q, picked) => q.build === 'syllable'
  ? compose(...picked.map(p => p.text))
  : picked.map(p => p.text).join(' ');

// Spielt eine Liste von Fragen ab. Im Übungsmodus kommen falsch
// beantwortete Fragen einmal am Ende wieder; gezählt wird nur der erste Versuch.
// Richtige Antworten gehen von selbst weiter, falsche warten auf einen Tipp.
export function runSession(root, { questions, repeatWrong = false, onDone }) {
  const queue = [...questions];
  const total = questions.length;
  let index = 0;
  let right = 0;

  function show() {
    if (index >= queue.length) {
      onDone({ right, total });
      return;
    }
    const q = queue[index];
    root.innerHTML = `
      <div class="learn">
        ${progressBar(index, queue.length)}
        <p class="counter">${esc(t('ex.progress', { i: index + 1, n: queue.length }))} · ${esc(t('ex.' + q.type))}</p>
        ${promptCard(q.item, { mode: q.prompt })}
        ${q.build ? buildHtml(q) : choiceHtml(q)}
        <div class="feedback" hidden aria-live="polite"></div>
      </div>`;
    root.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => play(q.item.audio)));
    if (q.prompt === 'audio' || q.prompt === 'dialog') play(q.item.audio);
    if (q.build) wireBuild(q);
    else root.querySelectorAll('.option').forEach(btn => btn.addEventListener('click', () => answerChoice(q, btn)));
  }

  function wireBuild(q) {
    const picked = [];
    const preview = root.querySelector('[data-preview]');
    const check = root.querySelector('[data-check]');
    const refresh = () => {
      preview.textContent = previewText(q, picked) || ' ';
      root.querySelectorAll('[data-tile]').forEach(b => {
        b.disabled = picked.some(p => String(p.id) === b.dataset.tile);
      });
      check.disabled = picked.length !== q.answer.length;
    };
    root.querySelectorAll('[data-tile]').forEach(b => b.addEventListener('click', () => {
      if (picked.length >= q.answer.length) return;
      picked.push(q.tiles.find(tile => String(tile.id) === b.dataset.tile));
      refresh();
    }));
    root.querySelector('[data-undo]').addEventListener('click', () => { picked.pop(); refresh(); });
    check.addEventListener('click', () => {
      root.querySelectorAll('[data-tile], [data-undo], [data-check]').forEach(b => { b.disabled = true; });
      const ok = picked.map(p => p.text).join('|') === q.answer.join('|');
      preview.classList.add(ok ? 'is-right' : 'is-wrong');
      const correctText = q.build === 'syllable' ? q.item.hangul : q.answer.join(' ');
      finish(q, ok, correctText);
    });
  }

  function answerChoice(q, btn) {
    const chosen = q.options[Number(btn.dataset.i)];
    root.querySelectorAll('.option').forEach((b, i) => {
      b.disabled = true;
      if (q.options[i].correct) b.classList.add('is-right');
    });
    if (!chosen.correct) btn.classList.add('is-wrong');
    finish(q, chosen.correct, q.options.find(o => o.correct).text);
  }

  function next() { index++; show(); }

  function finish(q, ok, correctText) {
    recordAnswer(q.item.id, ok);
    if (ok && !q.retry) right++;
    if (!ok && repeatWrong && !q.retry) queue.push({ ...reshuffle(q), retry: true });
    if (q.prompt !== 'audio' && q.prompt !== 'dialog') play(q.item.audio);

    // Bei Dialogen die Bedeutung zeigen, damit man versteht, was gesagt wurde.
    const explain = q.explain
      ? `<p class="hint">„${esc(q.item.hangul)}“ = ${esc(tx(q.item.meaning))}<br>„${esc(q.item.reply.hangul)}“ = ${esc(tx(q.item.reply.meaning))}</p>`
      : '';
    const box = root.querySelector('.feedback');
    box.className = `feedback ${ok ? 'ok' : 'no'}`;
    box.hidden = false;
    if (ok && !explain) {
      box.innerHTML = `<strong>${esc(t('ex.correct'))}</strong>`;
      setTimeout(next, AUTO_NEXT_MS);
      return;
    }
    box.innerHTML = `
      <strong>${esc(ok ? t('ex.correct') : t('ex.wrongTitle'))}</strong>
      ${ok ? '' : `<span>${esc(t('ex.wrong'))} <b${q.korean ? ' lang="ko"' : ''}>${esc(correctText)}</b></span>`}
      ${explain}
      ${!ok && repeatWrong && !q.retry ? `<p class="hint">📒 ${esc(t('ex.again'))}</p>` : ''}
      <button class="btn primary" type="button" data-next>${esc(t('ex.continue'))}</button>`;
    const btnNext = box.querySelector('[data-next]');
    btnNext.addEventListener('click', next);
    btnNext.focus();
  }

  show();
}

// Ergebnisseite nach einer Runde, im Stil der anderen Trainer.
export function doneHtml({ emoji, title, lead, extra = '', buttons }) {
  return `
    <div class="learn done">
      <div class="result-emoji" aria-hidden="true">${emoji}</div>
      <h2>${esc(title)}</h2>
      <p class="lead">${esc(lead)}</p>
      ${extra}
      <div class="stack">${buttons}</div>
    </div>`;
}
