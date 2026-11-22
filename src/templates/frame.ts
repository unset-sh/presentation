// What the three previews share: the canvas, the small line at the top, the letter avatar and the footer.
// Sizes are the design's (unset-content-previews, 2026-11-18) at 1200 x 630, where its 1cqw is 12px.

import type { Look } from "../brand.ts";
import { HEIGHT, WIDTH } from "../contract/limits.ts";
import type { CheckedPicture } from "../contract/picture.ts";
import { initials } from "../layout/initials.ts";
import { type Box, box, image, type Node, type Placement, type TextStyle, text } from "../layout/tree.ts";

/** Left and right margin: 6.4% of the width. */
export const MARGIN = 76.8;
export const CONTENT_WIDTH = WIDTH - 2 * MARGIN;

type TextOptions = Placement &
  Pick<TextStyle, "colour"> &
  Partial<Pick<TextStyle, "maxLines" | "tracking" | "uppercase" | "shrinkTo" | "wrapLines">>;

export function display(
  look: Look,
  size: number,
  weight: 400 | 500,
  lineHeight: number,
  options: TextOptions,
): TextStyle {
  return { family: look.families.display, weight, size, lineHeight, maxLines: 1, ...options };
}

export function mono(look: Look, size: number, options: TextOptions & { lineHeight?: number }): TextStyle {
  return { family: look.families.mono, weight: 400, size, lineHeight: 1.3, maxLines: 1, ...options };
}

export function canvas(look: Look, children: Node[]): Box {
  return box(
    { position: "relative", width: WIDTH, height: HEIGHT, backgroundColor: look.palette.ground, clip: true },
    children,
  );
}

/** The small capital line in the top left corner. */
export function eyebrow(look: Look, value: string): Node {
  return text(
    value,
    mono(look, 22.8, {
      position: "absolute",
      left: MARGIN,
      top: 56.7,
      maxWidth: CONTENT_WIDTH,
      colour: look.palette.inkMuted,
      tracking: 0.075,
      uppercase: true,
    }),
  );
}

type PortraitOptions = { size: number; letterSize: number; letterColour: string; placement?: Placement };

/** The person's picture in a circle, or their initials on a plain circle when there is no picture. */
export function portrait(
  look: Look,
  picture: CheckedPicture | undefined,
  name: string,
  options: PortraitOptions,
): Node {
  const { size, letterSize, letterColour, placement = {} } = options;
  if (picture) return image(picture.bytes, { ...placement, width: size, height: size, circle: true });
  return box(
    {
      ...placement,
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: size / 2,
      backgroundColor: look.palette.portrait,
      alignItems: "center",
      justifyContent: "center",
    },
    [text(initials(name), mono(look, letterSize, { colour: letterColour, lineHeight: 1 }))],
  );
}

const MARK_HEIGHT = 24;

/** The line along the bottom: a note on the left, the mark and "unset.sh" on the right. */
export function footer(look: Look, note: string): Node {
  return box(
    {
      position: "absolute",
      left: MARGIN,
      right: MARGIN,
      bottom: 44.1,
      paddingTop: 25.2,
      borderTopColor: look.palette.line,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 24,
    },
    [
      text(note, mono(look, 22.2, { colour: look.palette.inkMuted })),
      box({ flexDirection: "row", alignItems: "center", gap: 18, flexShrink: 0 }, [
        image(look.mark.svg, { width: MARK_HEIGHT * look.mark.widthPerHeight, height: MARK_HEIGHT }),
        text("unset.sh", display(look, 34.8, 500, 1, { colour: look.palette.ink, tracking: -0.055 })),
      ]),
    ],
  );
}
