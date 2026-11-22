// Article preview: the title and a line of what it is about, signed by the author. Designed in Light.

import type { Look } from "../brand.ts";
import type { ParsedArticle } from "../contract/parse.ts";
import type { Theme } from "../contract/types.ts";
import { box, type Node, text } from "../layout/tree.ts";
import { canvas, display, eyebrow, footer, MARGIN } from "./frame.ts";

export const theme: Theme = "light";

export function article(preview: ParsedArticle, look: Look): Node {
  const { palette } = look;
  return canvas(look, [
    ...(preview.label ? [eyebrow(look, preview.label)] : []),
    box({ position: "absolute", left: MARGIN, top: 170.1, width: 1032, flexDirection: "column" }, [
      text(preview.title, display(look, 79.2, 500, 1.08, { colour: palette.ink, tracking: -0.055, maxLines: 2 })),
      ...(preview.excerpt
        ? [
            text(
              preview.excerpt,
              display(look, 33, 400, 1.4, { marginTop: 36, colour: palette.inkMuted, tracking: -0.02, maxLines: 2 }),
            ),
          ]
        : []),
    ]),
    footer(look, preview.authorName),
  ]);
}
