// The only file that talks to the renderer, Takumi (@takumi-rs/core 2.22.1; see docs/renderer-trial.md).
// Everything Takumi is given here is bytes and plain values. It is never given an address, so it has nothing to fetch.

import { createHash } from "node:crypto";
import { Renderer } from "@takumi-rs/core";
import type { BrandFont } from "./brand.ts";
import { HEIGHT, LIMITS, WIDTH } from "./contract/limits.ts";
import type { CheckedPicture } from "./contract/picture.ts";
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
 * One renderer for the process, holding the brand fonts and nothing else. It keeps no decoded image between
 * renders (`cache.images: "none"`, and `cache: "none"` on each image). With that cache on, a picture drawn
 * small after it was drawn large reuses the earlier bitmap, so the same input would not always give the same
 * bytes; and no person's picture stays in memory after their preview. tests/render.test.ts fails without it.
 */
function renderer(fonts: BrandFont[]): Promise<Renderer> {
  started ??= start(fonts);
  return started;
}

async function start(fonts: BrandFont[]): Promise<Renderer> {
  const takumi = new Renderer({ cache: { images: "none" } });
  for (const font of fonts) {
    const families = await takumi.registerFont({ name: font.family, data: font.data });
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

function textStyle(style: TextStyle) {
  return {
    ...placement(style),
    fontFamily: `"${style.family}"`,
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

type Session = { takumi: Renderer; families: string[]; images: TakumiImage[]; signal: AbortSignal };

/** How many lines the text takes at this style when nothing cuts it. */
async function lineCount(value: string, style: TextStyle, session: Session): Promise<number> {
  const { fontFamily, fontWeight, fontSize, lineHeight, letterSpacing, textTransform, width } = textStyle(style);
  const free = { fontFamily, fontWeight, fontSize, lineHeight, letterSpacing, textTransform, width };
  const measured = await session.takumi.measure(
    { type: "text", text: value, style: free },
    { fontFamilies: session.families, signal: session.signal, loadFallbackFonts: refuseUncoveredText },
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
    case "text":
      return { type: "text", text: node.text, style: textStyle(await fitted(node.text, node.style, session)) };
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
  fonts: BrandFont[],
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
  fonts: BrandFont[],
  lang: string | undefined,
  signal: AbortSignal,
): Promise<Uint8Array | "text-not-covered"> {
  const takumi = await renderer(fonts);
  const session: Session = { takumi, families: fonts.map((font) => font.family), images: [], signal };
  try {
    const tree = await translate(root, session);
    const prepared = await takumi.prepare(tree, {
      width: WIDTH,
      height: HEIGHT,
      fontFamilies: session.families,
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
