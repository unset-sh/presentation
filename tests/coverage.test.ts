// What the renderer does with every character, asked of the same renderer the previews are drawn with.
//
// `text-not-covered` rests on Takumi reporting the characters no font draws, and its documentation does not say
// how far that report goes. At 2.22.1 it does not go all the way: left alone, Takumi builds a letter it lacks from
// a plain letter and a loose accent, draws a few characters as an empty box, and reports neither. src/render.ts
// and src/contract/text.ts close those gaps, and these tests hold the renderer and the fonts to what is left:
// every character that gets as far as the renderer is either reported or drawn as itself.
//
// Run them again whenever Takumi or a font changes.

import assert from "node:assert/strict";
import { test } from "node:test";
import { looks } from "../src/brand.ts";
import { clean } from "../src/contract/text.ts";
import { fonts } from "../src/fonts.ts";
import { renderer } from "../src/render.ts";

const takumi = await renderer(fonts);
const { display, mono } = looks.light.families;
const stack = (family: string) => (fonts.chains[family] ?? []).map((name) => `"${name}"`).join(", ");

class Missing extends Error {
  characters: string[];
  constructor(characters: string[]) {
    super("missing characters");
    this.characters = characters;
  }
}

/** The characters of a text that the renderer reports no font in the stack draws. */
async function reported(value: string, fontFamily: string): Promise<string[]> {
  try {
    await takumi.prepare(
      { type: "text", text: value, style: { fontFamily, fontSize: 16 } },
      {
        width: 8000,
        height: 8000,
        fontFamilies: [],
        loadFallbackFonts: (characters) => {
          throw new Missing(characters);
        },
      },
    );
    return [];
  } catch (error) {
    if (error instanceof Missing) return error.characters;
    throw error;
  }
}

/** A short text alone, black on white, as raw pixels. */
function pixels(value: string, fontFamily: string): Promise<Buffer> {
  return takumi.render(
    {
      type: "container",
      style: {
        width: 96,
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
      },
      children: [{ type: "text", text: value, style: { fontFamily, fontSize: 32, color: "black" } }],
    },
    { width: 96, height: 48, fontFamilies: [], format: "raw" },
  );
}

/** What Takumi draws for a character no font holds: the first font's empty box. It prints a warning as it does. */
async function emptyBox(fontFamily: string): Promise<Buffer> {
  const output = globalThis.console;
  const warn = output.warn;
  output.warn = () => {
    // The warning names the character; it is expected here and says nothing new.
  };
  try {
    return await pixels(String.fromCodePoint(0x378), fontFamily);
  } finally {
    output.warn = warn;
  }
}

/**
 * Every character of the first two planes that can reach the renderer on its own: it survives cleaning unchanged,
 * and it is not a combining mark, which src/render.ts refuses before the renderer sees it.
 */
function candidates(): string[] {
  const found: string[] = [];
  for (let code = 0x20; code < 0x20000; code += 1) {
    if (code >= 0xd800 && code <= 0xdfff) continue;
    const character = String.fromCodePoint(code);
    if (clean(character) === character && !/\p{M}/u.test(character)) found.push(character);
  }
  return found;
}

async function accepted(fontFamily: string): Promise<string[]> {
  const all = candidates();
  const found: string[] = [];
  for (let start = 0; start < all.length; start += 256) {
    const block = all.slice(start, start + 256);
    const missing = new Set(await reported(block.join(" "), fontFamily));
    found.push(...block.filter((character) => !missing.has(character)));
  }
  return found;
}

const code = (character: string) => `U+${(character.codePointAt(0) ?? 0).toString(16).toUpperCase()}`;

for (const family of [display, mono]) {
  test(`${family}: every character the renderer does not report is drawn as itself`, async () => {
    const fontFamily = stack(family);
    const box = await emptyBox(fontFamily);
    const blank = await pixels(" ", fontFamily);
    const drawnAsBox: string[] = [];
    const drawnAsNothing: string[] = [];
    const characters = await accepted(fontFamily);
    for (const character of characters) {
      const drawn = await pixels(character, fontFamily);
      if (drawn.equals(box)) drawnAsBox.push(code(character));
      else if (drawn.equals(blank)) drawnAsNothing.push(code(character));
    }
    assert.deepEqual(drawnAsBox, []);
    assert.deepEqual(drawnAsNothing, []);
    // The scan saw the fonts: Western, Central European and Vietnamese letters are in, other scripts are not.
    for (const letter of ["a", "é", "ź", "Ł", "ğ", "ễ"]) assert.ok(characters.includes(letter), letter);
    for (const letter of ["я", "α", "中"]) assert.ok(!characters.includes(letter), letter);
  });
}

test("no font is given an accent of its own", async () => {
  const kept: string[] = [];
  for (let mark = 0x300; mark <= 0x36f; mark += 1) {
    const accent = String.fromCodePoint(mark);
    // Takumi draws these two from the spacing macron and diaeresis, and reports nothing. src/render.ts refuses
    // every loose accent itself, so they never get here; tests/render.test.ts checks that.
    if (mark === 0x304 || mark === 0x308) continue;
    if (/\p{Default_Ignorable_Code_Point}/u.test(accent)) continue;
    for (const family of [display, mono]) {
      if (!(await reported(`q${accent}`, stack(family))).includes(accent)) kept.push(`${family} ${code(accent)}`);
    }
  }
  assert.deepEqual(kept, []);
});
