import { getJSON } from './util.js';
import * as store from './store.js';

// Die Engine kennt keine festen Inhalte: alles kommt aus data/course.json
// und den dort verlinkten Lektionsdateien.
export const course = { passMark: 0.8, stages: [], lessons: new Map(), items: new Map() };

export async function loadContent() {
  const [c, jamo] = await Promise.all([getJSON('data/course.json'), getJSON('data/jamo.json')]);
  course.jamo = jamo;
  course.passMark = c.passMark ?? 0.8;
  course.finalQuestions = c.finalQuestions ?? 12;
  course.stages = c.stages;
  for (const stage of course.stages) {
    stage.lessonData = await Promise.all((stage.lessons || []).map(getJSON));
    stage.lessonData.forEach((lesson, i) => {
      lesson.stageId = stage.id;
      lesson.index = i;
      course.lessons.set(lesson.id, lesson);
      for (const item of lesson.items) course.items.set(item.id, item);
    });
  }
}

export const stageOf = lesson => course.stages.find(s => s.id === lesson.stageId);
export const passMarkOf = lesson => lesson.check?.passMark ?? course.passMark;

export const lessonPassed = id => !!store.get().lessons[id]?.passed;
export const stagePassed = id => !!store.get().stages[id]?.passed;

export function stageOpen(stage) {
  const i = course.stages.indexOf(stage);
  return i === 0 || stagePassed(course.stages[i - 1].id);
}

export function lessonOpen(lesson) {
  const stage = stageOf(lesson);
  if (!stageOpen(stage)) return false;
  if (lesson.index === 0 || stagePassed(stage.id)) return true;
  return lessonPassed(stage.lessonData[lesson.index - 1].id);
}

export function stageProgress(stage) {
  const total = stage.lessonData.length;
  const done = stage.lessonData.filter(l => lessonPassed(l.id)).length;
  return { done, total };
}

export function nextLesson(lesson) {
  return stageOf(lesson).lessonData[lesson.index + 1] || null;
}

// Antwortmöglichkeiten kommen aus allem, was bis zu dieser Lektion dran war.
export function poolUpTo(lesson) {
  const stage = stageOf(lesson);
  const idx = course.stages.indexOf(stage);
  const items = [];
  course.stages.slice(0, idx).forEach(s => s.lessonData.forEach(l => items.push(...l.items)));
  stage.lessonData.slice(0, lesson.index + 1).forEach(l => items.push(...l.items));
  return items;
}

export function stageItems(stage) {
  return stage.lessonData.flatMap(l => l.items);
}

export function stageExerciseTypes(stage) {
  return [...new Set(stage.lessonData.flatMap(l => l.exercises))];
}

// Zeichen und Endkonsonanten, die der Silbenbaukasten gerade anbieten darf:
// alles aus offenen Stufen.
export function builderLetters() {
  const open = course.stages.filter(stageOpen);
  const items = open.flatMap(stageItems);
  const of = type => [...new Set(items.filter(i => i.type === type).map(i => i.hangul))];
  const finals = [...new Set(items.filter(i => i.type === 'syllable' && i.parts?.length > 2).map(i => i.parts[2]))];
  return { consonants: of('consonant'), vowels: of('vowel'), finals };
}
