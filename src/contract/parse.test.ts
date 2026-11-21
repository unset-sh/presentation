import assert from "node:assert/strict";
import { test } from "node:test";
import { LIMITS } from "./limits.ts";
import { parseInput } from "./parse.ts";

const profile = { kind: "profile", name: "Mika Rowan", handle: "mika.example" };
const post = { kind: "post", author: { name: "Mika Rowan", handle: "mika.example" }, text: "Hello" };
const article = { kind: "article", author: { name: "Mika Rowan" }, title: "Hello" };

const refusal = (input: unknown, options?: unknown) => {
  const parsed = parseInput(input, options);
  assert.equal(parsed.ok, false);
  return parsed.ok ? undefined : `${parsed.reason} ${parsed.field}`;
};

test("the least each kind needs is accepted", () => {
  for (const input of [profile, post, article]) assert.equal(parseInput(input, undefined).ok, true);
});

test("text is cleaned on the way in", () => {
  const parsed = parseInput({ ...profile, name: "  Mika\n Rowan ", bio: "one\ttwo" }, undefined);
  assert.ok(parsed.ok && parsed.preview.kind === "profile");
  assert.equal(parsed.preview.person.name, "Mika Rowan");
  assert.equal(parsed.preview.bio, "one two");
});

test("an optional text that is empty once cleaned counts as left out", () => {
  const parsed = parseInput({ ...profile, bio: " \n ", eyebrow: "" }, undefined);
  assert.ok(parsed.ok && parsed.preview.kind === "profile");
  assert.equal("bio" in parsed.preview, false);
  assert.equal("eyebrow" in parsed.preview, false);
});

test("a missing, empty or wrongly typed field is invalid input, named by its path", () => {
  assert.equal(refusal(null), "invalid-input input");
  assert.equal(refusal("profile"), "invalid-input input");
  assert.equal(refusal([]), "invalid-input input");
  assert.equal(refusal({}), "invalid-input kind");
  assert.equal(refusal({ ...profile, kind: "banner" }), "invalid-input kind");
  assert.equal(refusal({ ...profile, name: "   " }), "invalid-input name");
  assert.equal(refusal({ ...profile, handle: 7 }), "invalid-input handle");
  assert.equal(refusal({ ...profile, bio: ["a"] }), "invalid-input bio");
  assert.equal(refusal({ ...post, author: "Mika" }), "invalid-input author");
  assert.equal(refusal({ ...post, author: { name: "Mika" } }), "invalid-input author.handle");
  assert.equal(refusal({ ...post, text: undefined }), "invalid-input text");
  assert.equal(refusal({ ...article, author: {} }), "invalid-input author.name");
  assert.equal(refusal({ ...article, title: "" }), "invalid-input title");
});

test("a handle that brings its own at sign is refused", () => {
  assert.equal(refusal({ ...profile, handle: "@mika.example" }), "invalid-input handle");
});

test("text over its limit is refused, not cut", () => {
  assert.equal(refusal({ ...profile, name: "a".repeat(LIMITS.text.name + 1) }), "input-too-large name");
  assert.equal(refusal({ ...post, text: "a".repeat(LIMITS.text.postText + 1) }), "input-too-large text");
  assert.equal(parseInput({ ...post, text: "a".repeat(LIMITS.text.postText) }, undefined).ok, true);
});

test("a picture is checked where it is read", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(parseInput({ ...profile, picture: { bytes: png, mediaType: "image/png" } }, undefined).ok, true);
  assert.equal(refusal({ ...profile, picture: { bytes: png, mediaType: "image/jpeg" } }), "picture-unreadable picture");
  assert.equal(
    refusal({ ...post, author: { ...post.author, picture: "https://example.com/a.png" } }),
    "invalid-input author.picture",
  );
});

test("a language tag is letters, digits and hyphens", () => {
  assert.equal(parseInput({ ...profile, lang: "pt-BR" }, undefined).ok, true);
  assert.equal(refusal({ ...profile, lang: "english, please" }), "invalid-input lang");
  assert.equal(refusal({ ...profile, lang: 5 }), "invalid-input lang");
});

test("the theme is dark, light or left out", () => {
  assert.equal(parseInput(profile, {}).ok, true);
  assert.equal(parseInput(profile, { theme: "dark" }).ok, true);
  assert.equal(refusal(profile, { theme: "sepia" }), "invalid-input options.theme");
  assert.equal(refusal(profile, "dark"), "invalid-input options");
});
