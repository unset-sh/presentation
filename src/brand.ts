// The only file that reads @unset-sh/brand. Colours, fonts and the mark come from there and from nowhere else.
// A brand package this file cannot read as expected stops the import, so a broken install is seen at start-up.

import { readFileSync } from "node:fs";
import type { Theme } from "./contract/types.ts";

/** The colours a preview uses, by what they are for. */
export type Palette = {
  ground: string;
  ink: string;
  inkMuted: string;
  line: string;
  portrait: string;
  plum: string;
};

export type BrandFont = { family: string; data: Uint8Array };

/** What a template draws with: one theme's colours and mark, and the font families. */
export type Look = {
  palette: Palette;
  families: { display: string; mono: string };
  mark: { svg: Uint8Array; widthPerHeight: number };
};

const brandFile = (path: string) => readFileSync(new URL(import.meta.resolve(`@unset-sh/brand/${path}`)));

type Named = { name: string; value: unknown };
type Tokens = {
  color: { tokens: Named[] };
  type: { fonts: { family: string; file: string }[]; families: { display: string; mono: string } };
  mark: { tokens: Named[] };
};

const tokens = JSON.parse(brandFile("tokens.json").toString("utf8")) as Tokens;

function token(list: Named[], name: string): unknown {
  const found = list.find((entry) => entry.name === name);
  if (!found) throw new Error(`@unset-sh/brand has no token named ${name}`);
  return found.value;
}

function colour(name: string, theme: Theme): string {
  const value = (token(tokens.color.tokens, name) as Partial<Record<Theme, unknown>>)[theme];
  if (typeof value !== "string") throw new Error(`@unset-sh/brand token ${name} has no ${theme} colour`);
  return value;
}

function palette(theme: Theme): Palette {
  return {
    ground: colour("ground", theme),
    ink: colour("ink", theme),
    inkMuted: colour("ink-muted", theme),
    line: colour("line", theme),
    // The designs put the letter avatar one step below the ground in Light and one step above it in Dark.
    portrait: colour(theme === "light" ? "surface-sunken" : "surface-card", theme),
    plum: colour("plum", theme),
  };
}

/** The first family of a CSS font stack, which is the brand's own font. */
function firstFamily(stack: string): string {
  const family = stack.split(",")[0]?.trim().replace(/^"|"$/g, "");
  if (!family) throw new Error("@unset-sh/brand has an empty font stack");
  return family;
}

function font(family: string): BrandFont {
  const entry = tokens.type.fonts.find((candidate) => candidate.family === family);
  if (!entry) throw new Error(`@unset-sh/brand ships no font file for ${family}`);
  return { family, data: brandFile(entry.file) };
}

// Three rings and the two gaps between them, over one ring's height.
const ring = Number(token(tokens.mark.tokens, "mark-ring-diameter"));
const gap = Number(token(tokens.mark.tokens, "mark-gap"));
const markWidthPerHeight = (3 * ring + 2 * gap) / ring;
if (!Number.isFinite(markWidthPerHeight)) throw new Error("@unset-sh/brand has no usable mark geometry");

const families = { display: firstFamily(tokens.type.families.display), mono: firstFamily(tokens.type.families.mono) };

export const fonts: BrandFont[] = [font(families.display), font(families.mono)];

// The mark is drawn in the opposite tone of the ground: the Onyx mark on Platinum, the Platinum mark on Onyx.
export const looks: Record<Theme, Look> = {
  light: {
    palette: palette("light"),
    families,
    mark: { svg: brandFile("logo/unset-mark-onyx.svg"), widthPerHeight: markWidthPerHeight },
  },
  dark: {
    palette: palette("dark"),
    families,
    mark: { svg: brandFile("logo/unset-mark-platinum.svg"), widthPerHeight: markWidthPerHeight },
  },
};
