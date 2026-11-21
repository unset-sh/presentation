// What the contract promises, tested through the public entry only.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { cases } from "../gallery/cases.ts";
import { HEIGHT, LIMITS, type PreviewInput, renderPreview, version, WIDTH } from "../src/index.ts";
import { flatPng, hollowPng, isPng, pngSize } from "./pictures.ts";

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const profile = { kind: "profile", name: "Mika Rowan", handle: "mika.example" } as const;
const withPicture = (bytes: Uint8Array, mediaType: "image/png" | "image/jpeg" = "image/png"): PreviewInput => ({
  ...profile,
  picture: { bytes, mediaType },
});

async function drawn(input: PreviewInput, options?: Parameters<typeof renderPreview>[1]): Promise<Uint8Array> {
  const result = await renderPreview(input, options);
  assert.ok(result.ok, result.ok ? "" : `${result.reason} ${result.field ?? ""}`);
  return result.png;
}

async function refused(input: unknown, options?: unknown): Promise<string> {
  const result = await renderPreview(input as PreviewInput, options as never);
  assert.equal(result.ok, false);
  return result.ok ? "" : [result.reason, result.field].filter(Boolean).join(" ");
}

// No reach: any fetch, and anything written to the console, fails the run. The renderer's own wrapper can fetch
// and does print warnings; the toolkit must never give it a reason to.
const reached: string[] = [];
const output = globalThis.console;
const printing = ["warn", "error", "log", "info", "debug"] as const;
const original = { fetch: globalThis.fetch, print: printing.map((method) => output[method]) };
before(() => {
  globalThis.fetch = (...request) => {
    reached.push(`fetch ${String(request[0])}`);
    return Promise.reject(new Error("the toolkit must not fetch"));
  };
  for (const method of printing) {
    output[method] = (...words: unknown[]) => void reached.push(`${method} ${words.join(" ")}`);
  }
});
after(() => {
  globalThis.fetch = original.fetch;
  printing.forEach((method, index) => {
    const print = original.print[index];
    if (print) output[method] = print;
  });
});

test("every gallery case draws a 1200 x 630 PNG", async () => {
  for (const { id, input, options } of cases) {
    const png = await drawn(input, options);
    assert.ok(isPng(png), id);
    assert.deepEqual(pngSize(png), { width: WIDTH, height: HEIGHT }, id);
  }
});

test("the same input gives the same bytes", async () => {
  for (const { id, input, options } of cases) {
    assert.equal(sha256(await drawn(input, options)), sha256(await drawn(input, options)), id);
  }
});

test("each template has its own default theme, and the theme option overrides it", async () => {
  const asDesigned = sha256(await drawn(profile));
  assert.equal(sha256(await drawn(profile, { theme: "light" })), asDesigned);
  assert.notEqual(sha256(await drawn(profile, { theme: "dark" })), asDesigned);
});

test("a missing picture becomes the letter avatar, and a picture replaces it", async () => {
  const letters = sha256(await drawn(profile));
  assert.notEqual(sha256(await drawn(withPicture(flatPng(64, 64, [200, 30, 90])))), letters);
});

test("one person's picture is never drawn into the next preview", async () => {
  const red = withPicture(flatPng(64, 64, [200, 30, 30]));
  const blue = withPicture(flatPng(64, 64, [30, 30, 200]));
  const first = sha256(await drawn(blue));
  const between = sha256(await drawn(red));
  assert.notEqual(between, first);
  assert.equal(sha256(await drawn(blue)), first);
});

test("text no bundled font can draw is refused, and none of it is printed", async () => {
  const greek = String.fromCodePoint(0x3b1, 0x3b2, 0x3b3);
  assert.equal(await refused({ ...profile, bio: `Reads ${greek}` }), "text-not-covered");
  assert.equal(await refused({ ...profile, name: `Mika ${String.fromCodePoint(0x1f331)}` }), "text-not-covered");
  assert.deepEqual(reached, []);
});

test("a picture that is not a picture is unreadable", async () => {
  const jpegStart = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new TextEncoder().encode("not a picture at all")]);
  assert.equal(await refused(withPicture(jpegStart, "image/jpeg")), "picture-unreadable picture");
  assert.equal(await refused(withPicture(hollowPng(64, 64))), "picture-unreadable picture");
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9"/>');
  assert.equal(await refused(withPicture(svg)), "picture-unreadable picture");
});

test("an oversized picture is refused from its header, without being decoded", async () => {
  const side = LIMITS.pictureSide + 1;
  const started = performance.now();
  assert.equal(await refused(withPicture(hollowPng(side, 16))), "input-too-large picture");
  // Past the renderer's own ceiling the header reads as no picture at all. Either way nothing is decoded.
  assert.equal(await refused(withPicture(hollowPng(60000, 60000))), "picture-unreadable picture");
  assert.ok(performance.now() - started < 1000);
  const heavy = new Uint8Array(LIMITS.pictureBytes + 1);
  heavy.set(flatPng(1, 1, [0, 0, 0]));
  assert.equal(await refused(withPicture(heavy)), "input-too-large picture");
});

test("a picture at the size limit is drawn", async () => {
  await drawn(withPicture(flatPng(LIMITS.pictureSide, 2, [10, 120, 90])));
});

test("nothing the app sends makes a render throw", async () => {
  const junk: unknown[] = [undefined, null, 0, "profile", [], {}, { kind: "profile" }, { kind: Symbol("post") }];
  for (const input of junk) assert.match(await refused(input), /^invalid-input/);
  assert.equal(await refused(profile, { theme: "sepia" }), "invalid-input options.theme");
  const getter = Object.defineProperty({ kind: "profile", handle: "mika.example" }, "name", {
    enumerable: true,
    get: () => "Mika",
  });
  await drawn(getter as PreviewInput);
});

test("an address is never accepted in place of a picture", async () => {
  const address = "https://example.com/picture.png";
  assert.equal(await refused({ ...profile, picture: address }), "invalid-input picture");
  assert.equal(
    await refused({ ...profile, picture: { bytes: address, mediaType: "image/png" } }),
    "invalid-input picture",
  );
});

test("the version is the package's own", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
  assert.equal(version, manifest.version);
});

test("no render fetched anything or printed anything", () => {
  assert.deepEqual(reached, []);
});
