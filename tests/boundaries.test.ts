// The rules that keep the toolkit from drifting, checked by reading the source.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const files = (folder: string) =>
  readdirSync(new URL(folder, root), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => `${entry.parentPath.slice(root.pathname.length)}/${entry.name}`);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const source = files("src").filter((path) => !path.endsWith(".test.ts"));
const imports = (path: string) => [...read(path).matchAll(/from "([^"]+)"/g)].map((match) => match[1] ?? "");
const importers = (wanted: (specifier: string) => boolean) =>
  source.filter((path) => imports(path).some(wanted)).sort();

test("only render.ts talks to the renderer", () => {
  assert.deepEqual(
    importers((specifier) => specifier.startsWith("@takumi-rs/")),
    ["src/render.ts"],
  );
});

test("only brand.ts reads the brand package", () => {
  assert.deepEqual(
    source.filter((path) => read(path).includes("@unset-sh/brand/")),
    ["src/brand.ts"],
  );
});

test("only fonts.ts reads the font packages", () => {
  assert.deepEqual(
    source.filter((path) => read(path).includes("@fontsource")),
    ["src/fonts.ts"],
  );
});

test("only brand.ts, fonts.ts and index.ts read files, and render.ts only hashes", () => {
  const nodeModules = (path: string) => imports(path).filter((specifier) => specifier.startsWith("node:"));
  assert.deepEqual(
    importers((specifier) => specifier.startsWith("node:")),
    ["src/brand.ts", "src/fonts.ts", "src/index.ts", "src/render.ts"],
  );
  assert.deepEqual(nodeModules("src/brand.ts"), ["node:fs"]);
  assert.deepEqual(nodeModules("src/fonts.ts"), ["node:fs"]);
  assert.deepEqual(nodeModules("src/index.ts"), ["node:fs"]);
  assert.deepEqual(nodeModules("src/render.ts"), ["node:crypto"]);
});

test("templates and layout know nothing of the renderer", () => {
  const inner = source.filter((path) => path.startsWith("src/templates/") || path.startsWith("src/layout/"));
  assert.ok(inner.length > 0);
  for (const path of inner) assert.ok(!imports(path).some((specifier) => specifier.endsWith("render.ts")), path);
});

test("no colour is written in the source: colours come from the brand package", () => {
  for (const path of source) assert.doesNotMatch(read(path), /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/, path);
});

test("the source has no clock, no random value, no environment and no network call", () => {
  const reach = /\bDate\b|Math\.random|process\.env|\bfetch\(|node:https?|node:net|node:child_process|toLocale/;
  for (const path of source) assert.doesNotMatch(read(path), reach, path);
});

test("no file hides a direction override or an invisible character", () => {
  const hidden = /[\u{202A}-\u{202E}\u{2066}-\u{2069}\u{200B}-\u{200F}\u{FEFF}]/u;
  for (const path of [...files("src"), ...files("tests"), ...files("gallery")])
    assert.doesNotMatch(read(path), hidden, path);
});
