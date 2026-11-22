// The contract between an app and the toolkit. The app decides what is shown; these types are all it can say.

/** A picture as bytes the app has already processed and is allowed to show. There is no field for an address. */
export type Picture = {
  bytes: Uint8Array;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
};

/** A person as shown on a preview. `handle` comes without the leading at sign; the template adds it. */
export type Person = {
  name: string;
  handle: string;
  picture?: Picture;
};

export type ProfilePreview = Person & {
  kind: "profile";
  bio?: string;
  /** The small line above the name, for example "Meet Mika". Left out, the line stays empty. */
  eyebrow?: string;
  /** BCP 47 language of the text, used for shaping and line breaking. */
  lang?: string;
};

export type PostPreview = {
  kind: "post";
  author: Person;
  text: string;
  lang?: string;
};

export type ArticlePreview = {
  kind: "article";
  author: { name: string };
  title: string;
  excerpt?: string;
  /** The small line above the title, for example "Essay · 4 min read". Left out, the line stays empty. */
  label?: string;
  lang?: string;
};

export type PreviewInput = ProfilePreview | PostPreview | ArticlePreview;

export type Theme = "dark" | "light";

export type RenderOptions = {
  /** Left out, each template uses the theme it was designed in. */
  theme?: Theme;
};

/**
 * Why no image was drawn. The app shows its default image instead.
 *
 * - `invalid-input`: a field is missing, empty or of the wrong type.
 * - `input-too-large`: a text or picture is over a hard limit in `LIMITS`.
 * - `picture-unreadable`: the picture is not a JPEG, PNG or WebP file that decodes.
 * - `text-not-covered`: the text holds a character no bundled font can draw.
 * - `render-failed`: the renderer failed or ran out of time.
 */
export type FailureReason =
  | "invalid-input"
  | "input-too-large"
  | "picture-unreadable"
  | "text-not-covered"
  | "render-failed";

/** A failure names the reason and the input field, never the field's content. */
export type RenderFailure = { ok: false; reason: FailureReason; field?: string };

export type RenderResult = { ok: true; png: Uint8Array; width: 1200; height: 630 } | RenderFailure;
