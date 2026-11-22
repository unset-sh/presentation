import assert from "node:assert/strict";
import { test } from "node:test";
import { initials } from "./initials.ts";

test("first letter of the first and of the last word, in capitals", () => {
  assert.equal(initials("Mika Rowan"), "MR");
  assert.equal(initials("mika de la rowan"), "MR");
});

test("one word gives one letter", () => {
  assert.equal(initials("Mika"), "M");
});

test("words without a letter or digit are skipped", () => {
  assert.equal(initials("~ Mika - Rowan !"), "MR");
  assert.equal(initials("!!!"), "");
});

test("a letter with its accent stays one letter", () => {
  assert.equal(initials(`${String.fromCodePoint(0xe9)}mile zola`), `${String.fromCodePoint(0xc9)}Z`);
});
