import assert from "node:assert/strict";
import { test } from "node:test";
import { clean } from "./text.ts";

const fromCodes = (...codes: number[]) => String.fromCodePoint(...codes);

test("line breaks, tabs and space runs become one space", () => {
  assert.equal(clean("  one\n\ntwo\tthree \r\n four  "), "one two three four");
  assert.equal(clean(`a${fromCodes(0x2028)}b${fromCodes(0x2029)}c${fromCodes(0x85)}d`), "a b c d");
});

test("control characters are dropped", () => {
  assert.equal(clean(`a${fromCodes(0)}b${fromCodes(0x1b)}c${fromCodes(0x7f)}d`), "abcd");
});

test("direction overrides, embeddings and isolates are dropped", () => {
  const controls = [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069];
  for (const code of controls) assert.equal(clean(`mika${fromCodes(code)}.example`), "mika.example");
});

test("joiners that emoji and some scripts need are kept", () => {
  const joined = `a${fromCodes(0x200d)}b${fromCodes(0x200c)}c`;
  assert.equal(clean(joined), joined);
});

test("half of a surrogate pair is dropped", () => {
  assert.equal(clean(`a${String.fromCharCode(0xd83d)}b`), "ab");
});

test("text is composed, so one letter is one character where it can be", () => {
  assert.equal(clean(`e${fromCodes(0x301)}`), fromCodes(0xe9));
});

test("text that is only spaces and controls is empty", () => {
  assert.equal(clean(` \n\t${fromCodes(0x202e)} `), "");
});
