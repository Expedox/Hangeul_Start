export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Gewichtete Stichprobe ohne Zurücklegen (höheres Gewicht = eher gezogen).
export function weightedSample(list, n, weightOf) {
  return list
    .map(x => ({ x, key: Math.random() ** (1 / Math.max(weightOf(x), 0.0001)) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, n)
    .map(e => e.x);
}

// Lokales Datum als YYYY-MM-DD, offset in Tagen.
export function dayString(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}
