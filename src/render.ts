// The only file that talks to the renderer, Takumi (@takumi-rs/core 2.22.1; see docs/renderer-trial.md).
// Everything Takumi is given here is bytes and plain values. It is never given an address, so it has nothing to fetch.

import { createHash } from "node:crypto";
import { Renderer } from "@takumi-rs/core";
import { HEIGHT, LIMITS, WIDTH } from "./contract/limits.ts";
import type { CheckedPicture } from "./contract/picture.ts";
import type { Ranges, Typefaces } from "./fonts.ts";
import type { BoxStyle, ImageStyle, Node, Placement, TextStyle } from "./layout/tree.ts";

type TakumiNode = Exclude<Parameters<Renderer["prepare"]>[0], string>;
type TakumiImage = { src: string; data: Uint8Array; cache: "none" };

/**
 * An image goes to Takumi under a key that is the hash of its bytes. Takumi can keep what it learned about a key
 * between renders, so a key that names the bytes can never bring back a different picture.
 */
function keyed(bytes: Uint8Array): TakumiImage {
  return { src: createHash("sha256").update(bytes).digest("hex"), data: bytes, cache: "none" };
}

/** Raised by the missing-character callback below and caught in `draw`. It carries no text. */
class NotCovered extends Error {}

let started: Promise<Renderer> | undefined;

/**
 * One renderer for the process, holding the fonts of src/fonts.ts and nothing else. It keeps no decoded image
 * between renders (`cache.images: "none"`, and `cache: "none"` on each image). With that cache on, a picture
 * drawn small after it was drawn large reuses the earlier bitmap, so the same input would not always give the
 * same bytes; and no person's picture stays in memory after their preview. tests/render.test.ts fails without it.
 *
 * Exported for tests/coverage.test.ts, which asks this same renderer what it does with every character.
 */
export function renderer(fonts: Typefaces): Promise<Renderer> {
  started ??= start(fonts);
  return started;
}

/**
 * Every font is loaded without its combining marks (U+0300 to U+036F), as a `unicode-range` that leaves them
 * out. Takumi 2.22.1 otherwise builds a letter it lacks from parts: "z" and a loose acute for "ź", with the mark
 * beside the letter, and it does not report the letter as missing. Without the marks it cannot, so a letter is
 * drawn whole from one font or reported. Its documentation does not state this; tests/coverage.test.ts holds it
 * to it.
 */
const WITHOUT_COMBINING_MARKS: Ranges = [
  [0x0, 0x2ff],
  [0x370, 0x10ffff],
];
const holdsCombiningMarks = (ranges: Ranges) => ranges.some(([first, last]) => first <= 0x36f && last >= 0x300);

async function start(fonts: Typefaces): Promise<Renderer> {
  const takumi = new Renderer({ cache: { images: "none" } });
  for (const font of fonts.files) {
    if (font.only && holdsCombiningMarks(font.only))
      throw new Error(`font ${font.family} would be loaded with its combining marks`);
    const families = await takumi.registerFont({
      name: font.family,
      data: font.data,
      unicodeRange: font.only ?? WITHOUT_COMBINING_MARKS,
    });
    if (!families.some((family) => family.name === font.family))
      throw new Error(`font ${font.family} did not register`);
  }
  return takumi;
}

function placement(style: Placement) {
  const { position, left, right, top, bottom, width, height, maxWidth, marginTop, flexShrink } = style;
  return { position, left, right, top, bottom, width, height, maxWidth, marginTop, flexShrink };
}

function boxStyle(style: BoxStyle) {
  return {
    ...placement(style),
    display: "flex",
    flexDirection: style.flexDirection ?? "row",
    alignItems: style.alignItems,
    justifyContent: style.justifyContent,
    gap: style.gap,
    paddingTop: style.paddingTop,
    backgroundColor: style.backgroundColor,
    borderTop: style.borderTopColor && `1px solid ${style.borderTopColor}`,
    borderRadius: style.borderRadius,
    overflow: style.clip ? "hidden" : undefined,
  };
}

/** The fonts a text is drawn with, in order. Text in one brand family never borrows a letter from the other. */
function fontStack(family: string, chains: Typefaces["chains"]): string {
  const chain = chains[family];
  if (!chain) throw new Error(`no font is loaded for ${family}`);
  return chain.map((name) => `"${name}"`).join(", ");
}

function textStyle(style: TextStyle, chains: Typefaces["chains"]) {
  return {
    ...placement(style),
    fontFamily: fontStack(style.family, chains),
    fontWeight: style.weight,
    fontSize: style.size,
    lineHeight: style.lineHeight,
    letterSpacing: Math.round(style.size * (style.tracking ?? 0) * 100) / 100,
    color: style.colour,
    textTransform: style.uppercase ? "uppercase" : undefined,
    lineClamp: style.maxLines,
    textOverflow: "ellipsis",
    overflow: "hidden",
  };
}

function imageStyle(style: ImageStyle) {
  return {
    ...placement(style),
    flexShrink: 0,
    ...(style.circle && { borderRadius: "50%", objectFit: "cover" }),
  };
}

/** Takumi calls this with the characters no font draws, and would otherwise print them and draw empty boxes. */
const refuseUncoveredText = () => {
  throw new NotCovered();
};

/**
 * A combining mark that is still loose after the text was composed (see `clean`): no single character exists for
 * the letter and its mark together, as in a Yoruba "e" with a dot below and an acute above. No font here is given
 * its marks, and Takumi draws two of them (U+0304, U+0308) from the spacing accents without reporting them, so the
 * rule is written out: such text is not covered.
 */
const LOOSE_MARK = /[\p{M}--\p{Default_Ignorable_Code_Point}]/v;

type Session = { takumi: Renderer; chains: Typefaces["chains"]; images: TakumiImage[]; signal: AbortSignal };

/** No font beyond the text's own chain: Takumi would otherwise try every font it holds. */
const NO_OTHER_FONTS: string[] = [];

/** How many lines the text takes at this style when nothing cuts it. */
async function lineCount(value: string, style: TextStyle, session: Session): Promise<number> {
  const { fontFamily, fontWeight, fontSize, lineHeight, letterSpacing, textTransform, width } = textStyle(
    style,
    session.chains,
  );
  const free = { fontFamily, fontWeight, fontSize, lineHeight, letterSpacing, textTransform, width };
  const measured = await session.takumi.measure(
    { type: "text", text: value, style: free },
    { fontFamilies: NO_OTHER_FONTS, signal: session.signal, loadFallbackFonts: refuseUncoveredText },
  );
  return Math.round(measured.height / (style.size * style.lineHeight));
}

/** The style a text is drawn in: its own, or the first smaller size it fits at (see `shrinkTo` in the tree). */
async function fitted(value: string, style: TextStyle, session: Session): Promise<TextStyle> {
  if (!style.shrinkTo || style.width === undefined) return style;
  const sizes = [style.size, ...style.shrinkTo];
  for (const size of sizes) {
    const candidate = { ...style, size };
    if ((await lineCount(value, candidate, session)) <= style.maxLines) return candidate;
  }
  return { ...style, size: sizes.at(-1) ?? style.size, maxLines: style.wrapLines ?? style.maxLines };
}

/** The tree in Takumi's terms. Each image goes in by its key, with its bytes beside the tree. */
async function translate(node: Node, session: Session): Promise<TakumiNode> {
  switch (node.type) {
    case "box": {
      const children: TakumiNode[] = [];
      for (const child of node.children) children.push(await translate(child, session));
      return { type: "container", style: boxStyle(node.style), children };
    }
    case "text": {
      if (LOOSE_MARK.test(node.text)) throw new NotCovered();
      const style = textStyle(await fitted(node.text, node.style, session), session.chains);
      return { type: "text", text: node.text, style };
    }
    case "image": {
      const picture = keyed(node.bytes);
      session.images.push(picture);
      return { type: "image", src: picture.src, style: imageStyle(node.style) };
    }
  }
}

export type PictureProblem = "picture-unreadable" | "input-too-large";

/**
 * Looks at a picture before it is drawn, in two steps. Both rest on how Takumi 2.22.1 behaves, which its
 * documentation does not state; tests/render.test.ts holds it to this.
 *
 * 1. Measured as bytes inside the node, only the file's header is read: an unreadable file measures 0 x 0, and
 *    an oversized one is refused here without being decoded.
 * 2. Measured as a keyed image that is not cached, the file is decoded in full, and a file that does not
 *    decode raises.
 */
export async function inspectPicture(
  picture: CheckedPicture,
  fonts: Typefaces,
  signal: AbortSignal,
): Promise<PictureProblem | undefined> {
  const takumi = await renderer(fonts);
  const header = await takumi.measure({ type: "image", src: picture.bytes }, { signal });
  if (header.width < 1 || header.height < 1) return "picture-unreadable";
  if (Math.max(header.width, header.height) > LIMITS.pictureSide) return "input-too-large";
  try {
    const decoded = keyed(picture.bytes);
    await takumi.measure({ type: "image", src: decoded.src }, { images: [decoded], signal });
    return undefined;
  } catch (error) {
    if (signal.aborted) throw error;
    return "picture-unreadable";
  }
}

/** Draws the tree as a 1200 x 630 PNG, or reports that the text holds a character no bundled font can draw. */
export async function draw(
  root: Node,
  fonts: Typefaces,
  lang: string | undefined,
  signal: AbortSignal,
): Promise<Uint8Array | "text-not-covered"> {
  const takumi = await renderer(fonts);
  const session: Session = { takumi, chains: fonts.chains, images: [], signal };
  try {
    const tree = await translate(root, session);
    const prepared = await takumi.prepare(tree, {
      width: WIDTH,
      height: HEIGHT,
      fontFamilies: NO_OTHER_FONTS,
      images: session.images,
      signal,
      ...(lang && { lang }),
      loadFallbackFonts: refuseUncoveredText,
    });
    return await takumi.render(prepared, { format: "png", signal });
  } catch (error) {
    if (error instanceof NotCovered) return "text-not-covered";
    throw error;
  }
}
