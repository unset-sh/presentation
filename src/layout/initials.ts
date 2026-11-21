// The letters shown when a person has no picture: the first letter of the first and of the last word of the name.

// A fixed locale, so the machine's own locale never changes an image.
const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

function firstLetter(word: string): string {
  for (const { segment } of graphemes.segment(word)) {
    if (/[\p{L}\p{N}]/u.test(segment)) return segment.toUpperCase();
  }
  return "";
}

export function initials(name: string): string {
  const letters = name.split(" ").map(firstLetter).filter(Boolean);
  const first = letters[0] ?? "";
  const last = letters.length > 1 ? (letters.at(-1) ?? "") : "";
  return first + last;
}
