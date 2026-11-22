// @unset-sh/presentation: supplied data in, a preview image out. This is the only public entry.

import { readFileSync } from "node:fs";
import { HEIGHT, LIMITS, WIDTH } from "./contract/limits.ts";
import { type ParsedPreview, parseInput } from "./contract/parse.ts";
import type { CheckedPicture } from "./contract/picture.ts";
import type { PreviewInput, RenderOptions, RenderResult, Theme } from "./contract/types.ts";
import { fonts } from "./fonts.ts";
import { draw, inspectPicture } from "./render.ts";
import { compose } from "./templates/compose.ts";

export type {
  ArticlePreview,
  FailureReason,
  Person,
  Picture,
  PostPreview,
  PreviewInput,
  ProfilePreview,
  RenderFailure,
  RenderOptions,
  RenderResult,
  Theme,
} from "./contract/types.ts";
export { HEIGHT, LIMITS, WIDTH };

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};

/** This package's version. Same input and same version give the same image, so it belongs in a cache key. */
export const version: string = packageJson.version;

function pictureOf(preview: ParsedPreview): { picture: CheckedPicture; field: string } | undefined {
  if (preview.kind === "profile" && preview.person.picture)
    return { picture: preview.person.picture, field: "picture" };
  if (preview.kind === "post" && preview.author.picture)
    return { picture: preview.author.picture, field: "author.picture" };
  return undefined;
}

async function render(preview: ParsedPreview, theme: Theme | undefined): Promise<RenderResult> {
  const signal = AbortSignal.timeout(LIMITS.renderMs);
  const supplied = pictureOf(preview);
  if (supplied) {
    const problem = await inspectPicture(supplied.picture, fonts, signal);
    if (problem) return { ok: false, reason: problem, field: supplied.field };
  }
  const png = await draw(compose(preview, theme), fonts, preview.lang, signal);
  if (png === "text-not-covered") return { ok: false, reason: "text-not-covered" };
  return { ok: true, png, width: WIDTH, height: HEIGHT };
}

/**
 * Draws the preview image for a profile, a post or an article.
 *
 * It never throws and never reaches outside the process: no network, no environment, and no file except the
 * fonts and artwork that ship in this package and in @unset-sh/brand. When no image can be drawn, the result
 * says why, and the app shows its default image.
 */
export async function renderPreview(input: PreviewInput, options?: RenderOptions): Promise<RenderResult> {
  const parsed = parseInput(input, options);
  if (!parsed.ok) return parsed;
  try {
    return await render(parsed.preview, parsed.theme);
  } catch {
    return { ok: false, reason: "render-failed" };
  }
}
