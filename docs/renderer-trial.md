# Renderer trial

Decided 2026-11-21. The renderer is [Takumi](https://takumi.kane.tw) (`@takumi-rs/core` 2.22.1), used from one
file, [`src/render.ts`](../src/render.ts).

## What was asked of a renderer

Draw Alex's three preview designs (profile, post, article; 1200 x 630) from data, with the brand's fonts as
`@unset-sh/brand` ships them, and:

- look like the design, measured against a browser;
- open no network connection and read no font from the machine;
- give the same bytes for the same input;
- cope with long text, text in several scripts, emoji, a round picture and the SVG mark;
- fail in a way the toolkit can name when a picture is broken or a character has no font.

## How it was measured

One tree of boxes, text and images described the three designs. Every candidate drew that same tree, so a
difference came from the renderer and not from the template. Eight cases: the three designs, a profile with a
picture on the dark ground, a long profile, a long post, a post mixing Japanese, Arabic, Hebrew, accents and
emoji, and an article with no illustration.

The reference was the same tree as HTML in headless Chromium, offline, with the same font files. Each
candidate's image was compared with it pixel by pixel (pixelmatch, threshold 0.1). Each case was drawn five
times for timing and for repeatability. Network use was tested by running with no network at all
(`unshare -rn`) and by tracing `connect` and font file opens (`strace`). All of it on Linux x64, Node 26.12.0.

## Result

| Candidate | Draws the designs | Pixels differing from the browser | Time per image | Brand's variable fonts | Reach |
| --- | --- | --- | --- | --- | --- |
| **Takumi** `@takumi-rs/core` 2.22.1 | All 8 | 0.00% to 0.01% | 5 to 8 ms | Work at every weight | No connection, no system font |
| satori 0.63.2 + `@resvg/resvg-js` 2.6.2 | All 8, emoji as empty boxes | 0.03% to 0.50% with static fonts, 4.06% on the mixed-script post; 0.57% to 4.05% with the variable fonts | 25 to 52 ms | Only the default weight: every text came out Light | No connection, no system font |
| `@napi-rs/canvas` 1.2.0 | Profile and post, by hand-written layout | 0.35% to 0.61% | 29 to 60 ms | Work | No connection, but opened 233 font files of the machine |
| skia-canvas 4.0.1 | Not run on the cases | | | Work | Same kind as canvas: all layout by hand |
| sharp 0.35.5 | Not run on the cases | | | Work | Draws one block of text at a time; all layout by hand |
| `@vercel/og` 1.0.3 | Not run on the cases | | | As satori | Wraps satori; its bundle holds the addresses of Google Fonts and an emoji CDN, which it fetches from for characters it has no font for |
| `@ethercorps/sveltekit-og` 4.4.0 | Not run on the cases | | | As satori | Needs `@sveltejs/kit`, and wraps an older satori |

All candidates that were run gave the same bytes on every repeat.

## Why Takumi

- It is the only candidate that drew the designs as the browser does, to within one pixel in ten thousand.
- It uses the brand's variable fonts as they are. satori would force the brand package to ship a static file
  for every weight, and to keep those in step with the variable ones.
- It lays out text itself: wrapping, cutting with an ellipsis after a number of lines, right-to-left text, and
  per-character font fallback. The canvas family leaves all of that to us, and the two designs written that way
  already wrapped differently from the browser.
- It reads no font from the machine. `@napi-rs/canvas` falls back to whatever is installed, so an image would
  depend on the server it was drawn on.
- It tells us which characters no font can draw, before drawing, so the toolkit can refuse instead of drawing
  empty boxes.
- It is several times faster than the next candidate, with no install script and no dependency beyond its own
  prebuilt binary (8.6 MB on Linux x64). Licence: MIT or Apache-2.0.

## What to watch

These are the reasons Takumi sits behind one file and a set of tests, and is not used anywhere else.

- **It is young and moves fast.** One maintainer, seven releases in the four weeks before this trial. The call
  that reports uncovered characters (`loadFallbackFonts`) first shipped on 2026-11-20, the day before. 2.22.1
  was taken one day old, with Alex's approval, as a dated exception to the 7-day wait in [`.npmrc`](../.npmrc).
- **Its wrapper can fetch.** Given an address as an image or a font, it downloads it. The toolkit only ever
  gives it bytes, the contract has no field for an address, and a test replaces `fetch` and fails if it is called.
- **It prints the text it cannot draw.** Without `loadFallbackFonts`, a render with an uncovered character logs
  those characters with `console.warn` and draws empty boxes. The toolkit raises inside that callback, which
  stops both; a test fails if anything is printed.
- **It has a font of its own.** With no font registered, Latin text is drawn in its bundled Geist. The toolkit
  names the brand families for every render and checks that both registered.
- **Its image cache changes pixels.** With the cache on, a picture drawn small after being drawn large reuses
  the earlier bitmap, so the same input does not always give the same bytes. The toolkit turns the cache off,
  and keys every image by the hash of its bytes.
- **Behaviour its documentation does not state.** The picture checks rely on two things seen in 2.22.1: an
  image given as bytes inside a node is measured from its header alone (an 8000 x 8000 PNG in 3 ms, against
  420 ms to decode it), and an image given by key with the cache off is decoded when measured, and raises if it
  does not decode. `tests/render.test.ts` holds both in place, so an update that changes either fails CI.

## How it behaves on bad input

| Input | Takumi alone | The toolkit |
| --- | --- | --- |
| Bytes that are not a picture | Draws nothing, no error | `picture-unreadable` |
| A PNG with a valid header and broken pixel data | Raises when decoding | `picture-unreadable` |
| A picture wider or taller than 4096 px | Decodes it (0.4 s at 8000 x 8000) | `input-too-large`, from the header, without decoding |
| A picture past Takumi's own ceiling (16000 x 16000) | Measures as no picture | `picture-unreadable` |
| An SVG that points at a remote file | Draws the SVG, no connection made | Refused earlier: only JPEG, PNG and WebP are accepted |
| A JPEG cut off half-way | Draws the half it has, the rest grey | Drawn the same way; not caught |
| A character no font draws | Empty box, and the character printed to the log | `text-not-covered`, nothing printed |

## Not verified

- **The same bytes on another machine.** Everything ran on Linux x64. Whether arm64 or macOS give the same
  bytes is not known. `@napi-rs/canvas` documents that its x64 and arm64 builds can differ by one colour level;
  Takumi documents nothing either way.
- **Text beyond the trial's fonts.** Japanese, Arabic, Hebrew and colour emoji were drawn correctly with Noto
  fonts added for the trial. The toolkit ships none of them yet, so today it refuses such text.

## What was read

- Takumi: its README and the type definitions and wrapper source of `@takumi-rs/core` 2.22.1
  (`dist/export.d.mts`, `dist/export.mjs`).
- satori: its README for 0.63.2, which lists the font formats it reads and says it does not support variable
  font weights other than the default.
- `@vercel/og` 1.0.3 and `@ethercorps/sveltekit-og` 4.4.0: their published packages (`package.json`, `dist/`).
- `@napi-rs/canvas` 1.2.0, skia-canvas 4.0.1, sharp 0.35.5: their READMEs and a weight test of the brand fonts.
