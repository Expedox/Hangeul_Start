import { getJSON } from './util.js';

// Nur Dateien aus audio/manifest.json werden abgespielt, damit fehlende
// Platzhalter-Aufnahmen keine Ladefehler erzeugen.
let available = new Set();
let current = null;

export async function initAudio() {
  try {
    const m = await getJSON('audio/manifest.json');
    available = new Set(m.files || []);
  } catch {
    available = new Set();
  }
}

export const hasAudio = path => !!path && available.has(path);

export function play(path) {
  if (!hasAudio(path)) return false;
  if (current) current.pause();
  current = new Audio(path);
  current.play().catch(() => {});
  return true;
}
