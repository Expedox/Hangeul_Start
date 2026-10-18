import { tx } from './i18n.js';
import { shuffle, weightedSample } from './util.js';
import { itemWeight } from './store.js';
import { course } from './content.js';
import { INITIALS, VOWELS, isInitial, isVowel } from './hangul.js';

// Übungsarten. Auswahl-Übungen sagen, was gezeigt wird und welcher Text die
// richtige Antwort ist. Bau-Übungen (build) erwarten Bausteine in Reihenfolge.
export const EXERCISES = {
  'see-sound':      { fits: i => i.hangul && i.sound && i.type !== 'dialog', prompt: 'hangul', answer: i => tx(i.sound) },
  'hear-char':      { fits: i => i.hangul && i.audio && i.type !== 'dialog', prompt: 'audio', answer: i => i.hangul, korean: true },
  'see-meaning':    { fits: i => i.hangul && i.meaning && i.type !== 'dialog', prompt: 'hangul', answer: i => tx(i.meaning) },
  'hear-meaning':   { fits: i => i.meaning && i.audio && i.type !== 'dialog', prompt: 'audio', answer: i => tx(i.meaning) },
  'pick-hangul':    { fits: i => i.hangul && i.meaning && i.type !== 'dialog', prompt: 'meaning', answer: i => i.hangul, korean: true },
  'dialog-reply':   { fits: i => i.reply?.hangul && i.wrongReplies?.length, prompt: 'dialog' },
  'build-syllable': { fits: i => i.type === 'syllable' && i.parts?.length >= 2, prompt: 'sound', build: 'syllable' },
  'build-sentence': { fits: i => i.type !== 'syllable' && i.parts?.length >= 2 && i.meaning, prompt: 'meaning', build: 'sentence' }
};

const OPTION_COUNT = 4;
const LETTER_TYPES = ['vowel', 'consonant'];
const kindOf = item => LETTER_TYPES.includes(item.type) ? 'letter' : item.type;
const SHORT = 2;

function choiceQuestion(type, item, pool) {
  const ex = EXERCISES[type];
  const correct = ex.answer(item);
  const used = new Set([correct]);
  const pick = candidates => {
    const out = [];
    for (const c of shuffle(candidates)) {
      if (c.id === item.id || c.hangul === item.hangul || !ex.fits(c)) continue;
      const text = ex.answer(c);
      if (!text || used.has(text)) continue;
      used.add(text);
      out.push(text);
    }
    return out;
  };
  // Zuerst Ablenker derselben Art (Buchstabe zu Buchstabe), dann auffüllen.
  const all = [...course.items.values()];
  const sameKind = c => kindOf(c) === kindOf(item);
  let wrong = [];
  for (const source of [pool.filter(sameKind), all.filter(sameKind), all]) {
    if (wrong.length >= OPTION_COUNT - 1) break;
    wrong = wrong.concat(pick(source));
  }
  wrong = wrong.slice(0, OPTION_COUNT - 1);
  const options = shuffle([{ text: correct, correct: true }, ...wrong.map(text => ({ text, correct: false }))]);
  return { type, item, options, prompt: ex.prompt, korean: !!ex.korean };
}

function dialogQuestion(item) {
  const options = shuffle([
    { text: item.reply.hangul, note: tx(item.reply.meaning), correct: true },
    ...item.wrongReplies.slice(0, OPTION_COUNT - 1).map(r => ({ text: r.hangul, note: tx(r.meaning), correct: false }))
  ]);
  return { type: 'dialog-reply', item, options, prompt: 'dialog', korean: true, explain: true };
}

// Ablenker-Zeichen für den Silbenbaukasten: bekannte Zeichen aus dem Pool zuerst.
function jamoDistractors(parts, pool, test, count) {
  const known = pool.filter(i => LETTER_TYPES.includes(i.type)).map(i => i.hangul).filter(test);
  const fallback = (test === isVowel ? VOWELS : INITIALS).slice(0, 14);
  const out = [];
  for (const j of [...shuffle(known), ...shuffle(fallback)]) {
    if (out.length >= count) break;
    if (!parts.includes(j) && !out.includes(j)) out.push(j);
  }
  return out;
}

function buildQuestion(type, item, pool) {
  const ex = EXERCISES[type];
  let extra;
  if (ex.build === 'syllable') {
    extra = [
      ...jamoDistractors(item.parts, pool, isInitial, item.parts.length > 2 ? 3 : 2),
      ...jamoDistractors(item.parts, pool, isVowel, 2)
    ];
  } else {
    extra = item.extraParts || [];
  }
  const tiles = shuffle([...item.parts, ...extra]).map((text, i) => ({ id: i, text }));
  return { type, item, build: ex.build, tiles, answer: item.parts, prompt: ex.prompt, korean: true };
}

function makeQuestion(type, item, pool) {
  if (type === 'dialog-reply') return dialogQuestion(item);
  if (EXERCISES[type].build) return buildQuestion(type, item, pool);
  const q = choiceQuestion(type, item, pool);
  q.big = q.korean && q.options.every(o => [...o.text].length <= SHORT);
  return q;
}

export function reshuffle(q) {
  return q.build
    ? { ...q, tiles: shuffle(q.tiles) }
    : { ...q, options: shuffle(q.options) };
}

// Baut eine Übungsrunde: jeder Eintrag mindestens einmal (wenn Platz ist),
// der Rest gewichtet nach dem Fehlerheft.
export function buildQuestions(items, types, count, pool) {
  const candidates = [];
  for (const item of items) {
    for (const type of types) {
      if (EXERCISES[type]?.fits(item)) candidates.push({ type, item });
    }
  }
  if (!candidates.length) return [];

  const chosen = [];
  const coverable = [...new Set(candidates.map(c => c.item))];
  if (count >= coverable.length) {
    for (const item of shuffle(coverable)) {
      const own = candidates.filter(c => c.item === item);
      chosen.push(own[Math.floor(Math.random() * own.length)]);
    }
  }
  const rest = candidates.filter(c => !chosen.includes(c));
  chosen.push(...weightedSample(rest, count - chosen.length, c => itemWeight(c.item.id)));

  return shuffle(chosen).map(c => makeQuestion(c.type, c.item, pool));
}
