// Picks the template for a preview and the theme it is drawn in.

import { looks } from "../brand.ts";
import type { ParsedPreview } from "../contract/parse.ts";
import type { Theme } from "../contract/types.ts";
import type { Node } from "../layout/tree.ts";
import { article, theme as articleTheme } from "./article.ts";
import { post, theme as postTheme } from "./post.ts";
import { profile, theme as profileTheme } from "./profile.ts";

export function compose(preview: ParsedPreview, theme: Theme | undefined): Node {
  switch (preview.kind) {
    case "profile":
      return profile(preview, looks[theme ?? profileTheme]);
    case "post":
      return post(preview, looks[theme ?? postTheme]);
    case "article":
      return article(preview, looks[theme ?? articleTheme]);
  }
}
