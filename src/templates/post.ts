// Post preview: the words first, with who said them above. Designed in Dark.

import type { Look } from "../brand.ts";
import type { ParsedPost } from "../contract/parse.ts";
import type { Theme } from "../contract/types.ts";
import { box, type Node, text } from "../layout/tree.ts";
import { CONTENT_WIDTH, canvas, display, footer, MARGIN, mono, portrait } from "./frame.ts";

export const theme: Theme = "dark";

const AVATAR = 84;
const AVATAR_GAP = 24;

export function post(preview: ParsedPost, look: Look): Node {
  const { author } = preview;
  const { palette } = look;
  return canvas(look, [
    box(
      { position: "absolute", left: MARGIN, top: 59.85, flexDirection: "row", alignItems: "center", gap: AVATAR_GAP },
      [
        portrait(look, author.picture, author.name, { size: AVATAR, letterSize: 26.4, letterColour: palette.ink }),
        box({ flexDirection: "column", maxWidth: CONTENT_WIDTH - AVATAR - AVATAR_GAP }, [
          text(author.name, display(look, 34.8, 500, 1.2, { colour: palette.ink, tracking: -0.025 })),
          text(`@${author.handle}`, mono(look, 22.8, { marginTop: 8.4, colour: palette.inkMuted })),
        ]),
      ],
    ),
    text(
      preview.text,
      display(look, 73.2, 400, 1.18, {
        position: "absolute",
        left: MARGIN,
        top: 201.6,
        width: 1020,
        colour: palette.ink,
        tracking: -0.04,
        maxLines: 3,
      }),
    ),
    footer(look, "POST"),
  ]);
}
