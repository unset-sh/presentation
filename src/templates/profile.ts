// Profile preview: who this is, in their own words, with their picture. Designed in Light.

import type { Look } from "../brand.ts";
import type { ParsedProfile } from "../contract/parse.ts";
import type { Theme } from "../contract/types.ts";
import { box, type Node, text } from "../layout/tree.ts";
import { canvas, display, eyebrow, footer, MARGIN, mono, portrait } from "./frame.ts";

export const theme: Theme = "light";

const COPY_WIDTH = 696;
/** A long name shrinks in steps, then wraps onto a second line, then is cut. */
const NAME_FIT = { width: COPY_WIDTH, shrinkTo: [84, 72, 60], wrapLines: 2 };

export function profile(preview: ParsedProfile, look: Look): Node {
  const { person, bio } = preview;
  const { palette } = look;
  return canvas(look, [
    ...(preview.eyebrow ? [eyebrow(look, preview.eyebrow)] : []),
    box({ position: "absolute", left: MARGIN, top: 151.2, width: COPY_WIDTH, flexDirection: "column" }, [
      text(person.name, display(look, 98.4, 500, 1.06, { colour: palette.ink, tracking: -0.065, ...NAME_FIT })),
      text(`@${person.handle}`, mono(look, 30.6, { marginTop: 25.2, colour: palette.plum })),
      ...(bio
        ? [
            text(
              bio,
              display(look, 36, 400, 1.45, { marginTop: 48, colour: palette.inkMuted, tracking: -0.025, maxLines: 2 }),
            ),
          ]
        : []),
    ]),
    portrait(look, person.picture, person.name, {
      size: 288,
      letterSize: 84,
      letterColour: palette.plum,
      placement: { position: "absolute", right: 86.4, top: 163.8 },
    }),
    footer(look, "PROFILE"),
  ]);
}
