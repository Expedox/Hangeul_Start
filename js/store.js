import { dayString } from './util.js';

const KEY = 'hangeul-start-v1';
export const MAX_BOX = 5;

const fresh = () => ({
  version: 1,
  lang: null,
  theme: 'teen',
  goal: 20,
  lessons: {},   // id -> { passed, best }
  stages: {},    // id -> { passed, best, report: { right, total, date } }
  items: {},     // id -> { box, right, wrong, last }
  daily: { day: '', count: 0 },
  streak: { count: 0, last: '' },
  totals: { right: 0, wrong: 0 }
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* defekter oder gesperrter Speicher: frisch starten */ }
  return fresh();
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Speicher voll oder gesperrt */ }
}

export const get = () => state;

export function reset() {
  const { lang, theme, goal } = state;
  state = { ...fresh(), lang, theme, goal };
  save();
}

export function setLang(code) { state.lang = code; save(); }
export function setGoal(n) { state.goal = n; save(); }
export function setTheme(name) { state.theme = name; save(); }

export function todayCount() {
  return state.daily.day === dayString() ? state.daily.count : 0;
}

export function currentStreak() {
  const { count, last } = state.streak;
  return last === dayString() || last === dayString(-1) ? count : 0;
}

// Jede Antwort landet hier: Fehlerheft (Lernbox), Statistik, Tagesziel.
export function recordAnswer(itemId, correct) {
  const it = state.items[itemId] ??= { box: 0, right: 0, wrong: 0, last: 0 };
  if (correct) {
    it.right++;
    it.box = Math.min(it.box + 1, MAX_BOX);
  } else {
    it.wrong++;
    it.box = 0;
  }
  it.last = Date.now();
  state.totals[correct ? 'right' : 'wrong']++;

  const today = dayString();
  if (state.daily.day !== today) state.daily = { day: today, count: 0 };
  state.daily.count++;
  if (state.daily.count >= state.goal && state.streak.last !== today) {
    state.streak.count = state.streak.last === dayString(-1) ? state.streak.count + 1 : 1;
    state.streak.last = today;
  }
  save();
}

// Unsichere Einträge (niedrige Box) bekommen ein deutlich höheres Gewicht.
export function itemWeight(itemId) {
  const it = state.items[itemId];
  const box = it ? it.box : 1;
  return 2 ** (MAX_BOX - box);
}

export function itemStats(itemId) {
  return state.items[itemId];
}

export function completeLesson(id, score, passMark) {
  const l = state.lessons[id] ??= { passed: false, best: 0 };
  l.best = Math.max(l.best, score);
  if (score >= passMark) l.passed = true;
  save();
}

export function completeStage(stage, right, total, passMark) {
  const score = total ? right / total : 0;
  const s = state.stages[stage.id] ??= { passed: false, best: 0 };
  s.best = Math.max(s.best, score);
  s.report = { right, total, date: dayString() };
  if (score >= passMark) {
    s.passed = true;
    for (const l of stage.lessonData) {
      const ls = state.lessons[l.id] ??= { passed: false, best: 0 };
      ls.passed = true;
    }
  }
  save();
  return score;
}
