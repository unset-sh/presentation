// Text is plain text. Cleaning removes what could change how the surrounding text reads or draws, and nothing else.

declare const cleanText: unique symbol;
/** Text that went through `clean`: one line, no control characters, no direction overrides. */
export type CleanText = string & { readonly [cleanText]: true };

// Explicit direction embeddings, overrides and isolates (U+202A to U+202E, U+2066 to U+2069). They can reorder the
// text around them, for example to make a handle read as a different one.
// https://www.unicode.org/reports/tr9/#Explicit_Directional_Embeddings
const DIRECTION_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/gu;
const LONE_SURROGATES = /\p{Cs}/gu;
// Characters with no shape of their own: zero-width spaces, fillers, soft hyphens and the like, and the object
// placeholder U+FFFC. Left in, a name made only of them would count as a name, and the renderer draws some of
// them as an empty box without reporting it. The two joiners, the two emoji selectors and the tag characters stay,
// because scripts and emoji sequences need them.
// https://www.unicode.org/reports/tr44/#Default_Ignorable_Code_Point
const SHAPELESS =
  /[[\p{Default_Ignorable_Code_Point}\u{FFFC}]--[\u{200C}\u{200D}\u{FE0E}\u{FE0F}\u{E0020}-\u{E007F}]]/gv;
// Every kind of line break and space run, tabs included, becomes one space; other control characters are dropped.
const WHITESPACE_RUNS = /[\s\u{85}\u{2028}\u{2029}]+/gu;
const CONTROLS = /\p{Cc}/gu;
const NOTHING_TO_SEE = /^[\s\p{Default_Ignorable_Code_Point}]*$/u;

export function clean(value: string): CleanText {
  const cleaned = value
    .normalize("NFC")
    .replace(LONE_SURROGATES, "")
    .replace(DIRECTION_CONTROLS, "")
    .replace(SHAPELESS, "")
    .replace(WHITESPACE_RUNS, " ")
    .replace(CONTROLS, "")
    .trim();
  return (NOTHING_TO_SEE.test(cleaned) ? "" : cleaned) as CleanText;
}
