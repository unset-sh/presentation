// Text is plain text. Cleaning removes what could change how the surrounding text reads or draws, and nothing else.

declare const cleanText: unique symbol;
/** Text that went through `clean`: one line, no control characters, no direction overrides. */
export type CleanText = string & { readonly [cleanText]: true };

// Explicit direction embeddings, overrides and isolates (U+202A to U+202E, U+2066 to U+2069). They can reorder the
// text around them, for example to make a handle read as a different one.
// https://www.unicode.org/reports/tr9/#Explicit_Directional_Embeddings
const DIRECTION_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/gu;
const LONE_SURROGATES = /\p{Cs}/gu;
// Every kind of line break and space run, tabs included, becomes one space; other control characters are dropped.
const WHITESPACE_RUNS = /[\s\u0085\u2028\u2029]+/gu;
const CONTROLS = /\p{Cc}/gu;

export function clean(value: string): CleanText {
  return value
    .normalize("NFC")
    .replace(LONE_SURROGATES, "")
    .replace(DIRECTION_CONTROLS, "")
    .replace(WHITESPACE_RUNS, " ")
    .replace(CONTROLS, "")
    .trim() as CleanText;
}
