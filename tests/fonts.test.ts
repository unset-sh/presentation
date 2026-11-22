// The fonts of src/fonts.ts: which files there are, and that the slices added to the brand's files belong with them.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fonts as brandFonts, looks } from "../src/brand.ts";
import { fonts } from "../src/fonts.ts";

test("the brand's Space Grotesk file is the latin slice of the build the other slices come from", () => {
  const brand = brandFonts.find((font) => font.family === "Space Grotesk");
  assert.ok(brand);
  const latin = readFileSync(
    new URL(import.meta.resolve("@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2")),
  );
  assert.ok(latin.equals(brand.data));
});

test("each brand family is drawn with its own file first, and every family in a chain has a file", () => {
  const { display, mono } = looks.light.families;
  assert.deepEqual(Object.keys(fonts.chains).sort(), [display, mono].sort());
  // The mono typeface lends the display text its symbols and nothing else.
  assert.deepEqual(fonts.chains[display]?.at(-1), `${mono} Symbols`);
  assert.deepEqual(fonts.files.find((file) => file.family === `${mono} Symbols`)?.only, [[0x2190, 0x27bf]]);
  for (const [family, chain] of Object.entries(fonts.chains)) {
    assert.equal(chain[0], family);
    for (const name of chain)
      assert.ok(
        fonts.files.some((file) => file.family === name),
        name,
      );
  }
  assert.deepEqual(new Set(fonts.files.map((file) => file.family)), new Set(Object.values(fonts.chains).flat()));
});
