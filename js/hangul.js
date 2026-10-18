// Hangul-Silben aus Einzelzeichen zusammensetzen (Unicode-Block ab U+AC00).
export const INITIALS = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
export const VOWELS = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
export const FINALS = ['', ...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];

export const isInitial = j => INITIALS.includes(j);
export const isVowel = j => VOWELS.includes(j);

// Setzt so viel zusammen, wie schon da ist: nur Konsonant, Silbe, Silbe mit Endkonsonant.
export function compose(initial, vowel, final = '') {
  if (!initial) return vowel || '';
  if (!vowel) return initial;
  const l = INITIALS.indexOf(initial);
  const v = VOWELS.indexOf(vowel);
  const t = FINALS.indexOf(final);
  if (l < 0 || v < 0 || t < 0) return initial + vowel + final;
  return String.fromCharCode(0xac00 + (l * 21 + v) * 28 + t);
}
