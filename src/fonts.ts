// Every font file a preview is drawn with, and the order each kind of text tries them in.
//
// The brand's two files come from @unset-sh/brand, through brand.ts. The design sheet ships one slice of each
// typeface: Space Grotesk with Western European letters only (230 characters, no Polish, Czech or Turkish), and
// JetBrains Mono without Vietnamese. The other slices of the same two typefaces are read here from the Fontsource
// packages, which repackage the Google Fonts builds (https://fontsource.org/docs/getting-started/introduction,
// version 5.3.0). The brand's Space Grotesk file is byte for byte the "latin" slice of that same build, which
// tests/fonts.test.ts holds it to.
//
// This is a stopgap: a brand typeface belongs in @unset-sh/brand. When the design sheet ships the whole typefaces,
// the slices leave this file.

import { readFileSync } from "node:fs";
import { fonts as brandFonts, looks } from "./brand.ts";

/** Inclusive ranges of character codes. */
export type Ranges = [number, number][];

/**
 * One font file and the family name it is loaded under. With `only`, the file is used for those characters and
 * no others; without it, for every character it holds.
 */
export type FontFile = { family: string; data: Uint8Array; only?: Ranges };

/** The files to load, and for each brand family the families its text is drawn with, tried first to last. */
export type Typefaces = { files: FontFile[]; chains: Record<string, string[]> };

const slice = (typeface: string, name: string): Uint8Array =>
  readFileSync(
    new URL(import.meta.resolve(`@fontsource-variable/${typeface}/files/${typeface}-${name}-wght-normal.woff2`)),
  );

/** The slices each brand family is missing, by the brand's family name. A family not listed here stands alone. */
const missingSlices: Record<string, { typeface: string; slices: string[] }> = {
  "Space Grotesk": { typeface: "space-grotesk", slices: ["latin-ext", "vietnamese"] },
  "JetBrains Mono": { typeface: "jetbrains-mono", slices: ["latin-ext", "vietnamese"] },
};

// Arrows, mathematical signs, technical signs, box drawing, shapes and dingbats.
const SYMBOLS: Ranges = [[0x2190, 0x27bf]];

function typefaces(): Typefaces {
  const { display, mono } = looks.light.families;
  const files: FontFile[] = [];
  const chains: Record<string, string[]> = {};
  for (const font of brandFonts) {
    files.push(font);
    chains[font.family] = [font.family];
    const more = missingSlices[font.family];
    if (!more) continue;
    // A family of its own, tried second: the brand's file always wins for a letter both hold.
    const family = `${font.family} Extended`;
    for (const name of more.slices) files.push({ family, data: slice(more.typeface, name) });
    chains[font.family]?.push(family);
  }
  // Space Grotesk holds two arrows and no check mark. Display text takes symbols, and nothing but symbols, from
  // the mono file: an arrow in a post should not cost the whole image, and a borrowed letter would show.
  const monoFile = brandFonts.find((font) => font.family === mono);
  if (monoFile && display !== mono) {
    const family = `${mono} Symbols`;
    files.push({ family, data: monoFile.data, only: SYMBOLS });
    chains[display]?.push(family);
  }
  return { files, chains };
}

export const fonts: Typefaces = typefaces();
