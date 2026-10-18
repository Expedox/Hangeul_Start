import { t, tx } from '../i18n.js';
import { esc } from '../util.js';
import { hasAudio, play } from '../audio.js';
import { compose } from '../hangul.js';
import { course, builderLetters } from '../content.js';
import { setHeader } from '../ui.js';

// Lautschrift einer selbst gebauten Silbe aus den Zeichentabellen in data/jamo.json.
function soundOf(initial, vowel, final) {
  const { jamo } = course;
  const pick = entry => (entry ? tx(entry) : '');
  const start = jamo.special[initial + vowel] ? pick(jamo.special[initial + vowel])
    : pick(jamo.initial[initial]) + pick(jamo.vowel[vowel]);
  return start + (final ? pick(jamo.final[final]) : '');
}

const audioFor = syllable => `audio/syllables/${syllable}.mp3`;

// Silbenbaukasten: Konsonant + Vokal (+ Endkonsonant) antippen,
// die Silbe erscheint groß mit Lautschrift und wird vorgelesen.
export function builderView(root) {
  setHeader(t('builder.title'), '#/');
  const { consonants, vowels, finals } = builderLetters();
  const sel = { initial: consonants.includes('ㄴ') ? 'ㄴ' : consonants[0], vowel: vowels[0], final: '' };

  const group = (key, label, letters, withNone) => `
    <h3 class="section">${esc(label)}</h3>
    <div class="tiles-row">
      ${withNone ? `<button class="btn piece${sel[key] === '' ? ' on' : ''}" type="button" data-key="${key}" data-val="">${esc(t('builder.none'))}</button>` : ''}
      ${letters.map(j => `<button class="btn piece${sel[key] === j ? ' on' : ''}" type="button" lang="ko" data-key="${key}" data-val="${esc(j)}">${esc(j)}</button>`).join('')}
    </div>`;

  function render(speak = false) {
    const syllable = compose(sel.initial, sel.vowel, sel.final);
    root.innerHTML = `
      <div class="learn">
        <p class="lead">${esc(t('builder.lead'))}</p>
        <div class="prompt-card">
          ${hasAudio(audioFor(syllable)) ? `<button class="speak" type="button" data-play aria-label="${esc(t('ex.play'))}">🔊</button>` : ''}
          <span class="hangul" lang="ko">${esc(syllable)}</span>
          <span class="meaning">${esc(soundOf(sel.initial, sel.vowel, sel.final))}</span>
          <span class="hint" lang="ko">${esc(sel.initial)} + ${esc(sel.vowel)}${sel.final ? ` + ${esc(sel.final)}` : ''}</span>
        </div>
        ${group('initial', t('builder.consonant'), consonants)}
        ${group('vowel', t('builder.vowel'), vowels)}
        ${finals.length ? group('final', t('builder.final'), finals, true) : ''}
      </div>`;
    root.querySelector('[data-play]')?.addEventListener('click', () => play(audioFor(syllable)));
    root.querySelectorAll('[data-key]').forEach(b => b.addEventListener('click', () => {
      sel[b.dataset.key] = b.dataset.val;
      render(true);
    }));
    if (speak) play(audioFor(syllable));
  }
  render();
}
