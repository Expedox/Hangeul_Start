import { esc } from './util.js';

const titleEl = () => document.getElementById('title');
const backBtn = () => document.getElementById('back-btn');

export function setHeader(title, back) {
  titleEl().textContent = title;
  backBtn().hidden = !back;
  backBtn().onclick = () => { location.hash = back; };
}

export function goalRing(done, goal) {
  const pct = Math.min(1, goal ? done / goal : 0);
  const r = 26; const c = 2 * Math.PI * r;
  return `
    <svg class="ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="${r}" class="ring-bg"/>
      <circle cx="32" cy="32" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/>
      <text x="32" y="37" text-anchor="middle">${pct >= 1 ? '✓' : Math.round(pct * 100) + '%'}</text>
    </svg>`;
}

export const cta = (href, emoji, title, small, cls = '') => `
  <a class="card cta ${cls}" href="${href}">
    <span class="emoji" aria-hidden="true">${emoji}</span>
    <span><strong>${esc(title)}</strong><small>${esc(small)}</small></span>
    <span class="go" aria-hidden="true">›</span>
  </a>`;

export const progressBar = (done, total) =>
  `<div class="progress"><div class="bar" style="width:${total ? (done / total) * 100 : 0}%"></div></div>`;
