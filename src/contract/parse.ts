// The one place input is read. Everything past this point works on parsed values and never on what the app sent.

import { LIMITS } from "./limits.ts";
import { type CheckedPicture, checkPicture } from "./picture.ts";
import { type CleanText, clean } from "./text.ts";
import type { FailureReason, RenderFailure, Theme } from "./types.ts";

export type ParsedPerson = { name: CleanText; handle: CleanText; picture?: CheckedPicture };
export type ParsedProfile = {
  kind: "profile";
  person: ParsedPerson;
  bio?: CleanText;
  eyebrow?: CleanText;
  lang?: string;
};
export type ParsedPost = { kind: "post"; author: ParsedPerson; text: CleanText; lang?: string };
export type ParsedArticle = {
  kind: "article";
  authorName: CleanText;
  title: CleanText;
  excerpt?: CleanText;
  label?: CleanText;
  lang?: string;
};
export type ParsedPreview = ParsedProfile | ParsedPost | ParsedArticle;
export type Parsed = { ok: true; preview: ParsedPreview; theme?: Theme };

type Fields = Record<string, unknown>;

/** Raised and caught inside this file only; `parseInput` turns it into a result. */
class Refusal extends Error {
  readonly reason: FailureReason;
  readonly field: string;
  constructor(reason: FailureReason, field: string) {
    super(reason);
    this.reason = reason;
    this.field = field;
  }
}

function fields(value: unknown, field: string): Fields {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Refusal("invalid-input", field);
  return value as Fields;
}

function optionalText(source: Fields, key: string, field: string, limit: number): CleanText | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Refusal("invalid-input", field);
  if (value.length > limit) throw new Refusal("input-too-large", field);
  const text = clean(value);
  return text === "" ? undefined : text;
}

function requiredText(source: Fields, key: string, field: string, limit: number): CleanText {
  const text = optionalText(source, key, field, limit);
  if (text === undefined) throw new Refusal("invalid-input", field);
  return text;
}

function optionalPicture(source: Fields, field: string): CheckedPicture | undefined {
  if (source.picture === undefined) return undefined;
  const picture = checkPicture(source.picture);
  if (typeof picture === "string") throw new Refusal(picture, field);
  return picture;
}

// A language tag is letters, digits and hyphens: https://www.rfc-editor.org/rfc/rfc5646#section-2.1
const LANGUAGE_TAG = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8}){0,4}$/;

function optionalLang(source: Fields): string | undefined {
  if (source.lang === undefined) return undefined;
  if (typeof source.lang !== "string" || !LANGUAGE_TAG.test(source.lang)) throw new Refusal("invalid-input", "lang");
  return source.lang;
}

function person(source: Fields, prefix: string): ParsedPerson {
  const name = requiredText(source, "name", `${prefix}name`, LIMITS.text.name);
  const handle = requiredText(source, "handle", `${prefix}handle`, LIMITS.text.handle);
  // The template adds the at sign. A handle that brings its own would be drawn with two.
  if (handle.startsWith("@")) throw new Refusal("invalid-input", `${prefix}handle`);
  const picture = optionalPicture(source, `${prefix}picture`);
  return { name, handle, ...(picture && { picture }) };
}

function profile(source: Fields): ParsedProfile {
  const bio = optionalText(source, "bio", "bio", LIMITS.text.bio);
  const eyebrow = optionalText(source, "eyebrow", "eyebrow", LIMITS.text.eyebrow);
  const lang = optionalLang(source);
  return {
    kind: "profile",
    person: person(source, ""),
    ...(bio && { bio }),
    ...(eyebrow && { eyebrow }),
    ...(lang && { lang }),
  };
}

function post(source: Fields): ParsedPost {
  const lang = optionalLang(source);
  return {
    kind: "post",
    author: person(fields(source.author, "author"), "author."),
    text: requiredText(source, "text", "text", LIMITS.text.postText),
    ...(lang && { lang }),
  };
}

function article(source: Fields): ParsedArticle {
  const excerpt = optionalText(source, "excerpt", "excerpt", LIMITS.text.excerpt);
  const label = optionalText(source, "label", "label", LIMITS.text.label);
  const lang = optionalLang(source);
  return {
    kind: "article",
    authorName: requiredText(fields(source.author, "author"), "name", "author.name", LIMITS.text.name),
    title: requiredText(source, "title", "title", LIMITS.text.title),
    ...(excerpt && { excerpt }),
    ...(label && { label }),
    ...(lang && { lang }),
  };
}

function preview(source: Fields): ParsedPreview {
  switch (source.kind) {
    case "profile":
      return profile(source);
    case "post":
      return post(source);
    case "article":
      return article(source);
    default:
      throw new Refusal("invalid-input", "kind");
  }
}

function theme(options: unknown): Theme | undefined {
  if (options === undefined) return undefined;
  const value = fields(options, "options").theme;
  if (value === undefined || value === "dark" || value === "light") return value;
  throw new Refusal("invalid-input", "options.theme");
}

export function parseInput(input: unknown, options: unknown): Parsed | RenderFailure {
  try {
    const chosen = theme(options);
    return { ok: true, preview: preview(fields(input, "input")), ...(chosen && { theme: chosen }) };
  } catch (error) {
    if (error instanceof Refusal) return { ok: false, reason: error.reason, field: error.field };
    throw error;
  }
}
