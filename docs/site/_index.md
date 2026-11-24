---
title: Rendering
description: How unset.sh looks outside the app, drawn from supplied data by the @unset-sh/rendering package.
type: docs
cascade:
  type: docs
menus:
  main:
    weight: 70
params:
  doc_kind: overview
---

`unset-sh/rendering` holds the templates and the renderer for everything unset.sh shows on other people's screens.
Today that is the 1200 x 630 preview image a link gets when it is shared, for a profile, a post or an article.
Embeds, share cards, QR codes, video end cards, email and badges are planned.

The line it draws: **the app decides what is shown, this package decides how it looks.** The app hands over plain
data it has already decided is public, and gets back an image. The package never fetches, never looks anything up
and has no opinion on who may see what. Its colours, fonts and mark come only from [`@unset-sh/brand`](https://github.com/unset-sh/brand) at one exact
version.

## Use it

Install an exact version of `@unset-sh/rendering` from GitHub Packages, with the `@unset-sh` scope pointed there and
a read-only package token in the environment. Then call `renderPreview`:

```ts
import { renderPreview, version } from "@unset-sh/rendering";

const result = await renderPreview({ kind: "profile", name: "Mika Rowan", handle: "mika.example" });
if (result.ok) {
  // result.png is a 1200 x 630 PNG. Cache it under a hash of the input plus `version`.
} else {
  // result.reason says why. Show the default image.
}
```

| Kind | Needs | May also have |
| --- | --- | --- |
| `profile` | `name`, `handle` | `bio`, `picture`, `eyebrow` |
| `post` | `author.name`, `author.handle`, `text` | `author.picture` |
| `article` | `author.name`, `title` | `excerpt`, `label` |

Every kind takes `lang`, and `renderPreview(input, { theme })` takes `"dark"` or `"light"`.

## What it promises

- **No reach.** No network, environment, clock, randomness, or file outside this package and the brand package.
- **Pictures are bytes.** No field takes an address. A picture must be a JPEG, PNG or WebP file that decodes.
- **Same input, same image**, byte for byte.
- **It never throws.** A failed render names a reason (`invalid-input`, `input-too-large`, `picture-unreadable`,
  `text-not-covered` or `render-failed`) and the field, never the content.
- **Whole letters or no image.** Text a bundled font cannot draw returns `text-not-covered`, never an empty box.

The [repository README](https://github.com/unset-sh/rendering#readme) covers the gallery, the source layout, adding
a template and why the renderer is Takumi.

## How it changes

Work lands on `staging`. A release is Alex's merge of `staging` into `main`; the shared release workflow then
checks, packs and publishes the package after the `release` approval.

This section is exported from `docs/site/` in `unset-sh/rendering`; edit it there.
