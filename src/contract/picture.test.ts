import assert from "node:assert/strict";
import { test } from "node:test";
import { LIMITS } from "./limits.ts";
import { checkPicture } from "./picture.ts";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');

test("a picture whose first bytes match its media type is accepted", () => {
  assert.equal(typeof checkPicture({ bytes: jpeg, mediaType: "image/jpeg" }), "object");
  assert.equal(typeof checkPicture({ bytes: png, mediaType: "image/png" }), "object");
  assert.equal(typeof checkPicture({ bytes: webp, mediaType: "image/webp" }), "object");
});

test("a picture that is not what it says it is, is unreadable", () => {
  assert.equal(checkPicture({ bytes: png, mediaType: "image/jpeg" }), "picture-unreadable");
  assert.equal(checkPicture({ bytes: svg, mediaType: "image/png" }), "picture-unreadable");
  assert.equal(checkPicture({ bytes: new Uint8Array(0), mediaType: "image/webp" }), "picture-unreadable");
});

test("other media types and other shapes are invalid input", () => {
  assert.equal(checkPicture({ bytes: svg, mediaType: "image/svg+xml" }), "invalid-input");
  assert.equal(checkPicture({ bytes: jpeg, mediaType: "toString" }), "invalid-input");
  assert.equal(checkPicture({ bytes: "https://example.com/picture.jpg", mediaType: "image/jpeg" }), "invalid-input");
  assert.equal(checkPicture("https://example.com/picture.jpg"), "invalid-input");
  assert.equal(checkPicture(null), "invalid-input");
});

test("a picture over the size limit is refused before its bytes are looked at", () => {
  const large = new Uint8Array(LIMITS.pictureBytes + 1);
  assert.equal(checkPicture({ bytes: large, mediaType: "image/png" }), "input-too-large");
});
