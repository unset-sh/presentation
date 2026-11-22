// What gets published: the built code and nothing else, and it draws the same as the source.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { cases } from "../gallery/cases.ts";
import { renderPreview } from "../src/index.ts";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("package.json", root), "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

test("the package holds the built code, the licence and the readme, and no test", () => {
  const [packed] = JSON.parse(
    execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: root, encoding: "utf8" }),
  ) as [{ files: { path: string }[] }];
  const paths = packed.files.map((file) => file.path);
  const outside = paths.filter((path) => !path.startsWith("dist/")).sort();
  assert.deepEqual(outside, ["LICENSE", "README.md", "package.json"]);
  assert.ok(paths.includes("dist/index.js") && paths.includes("dist/index.d.ts"));
  assert.deepEqual(
    paths.filter((path) => path.includes(".test.")),
    [],
  );
});

test("every dependency names one exact version", () => {
  const exact = /^\d+\.\d+\.\d+$/;
  for (const [name, range] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
    assert.ok(exact.test(range), `${name} ${range}`);
  }
});

test("the built package draws the same bytes as the source", async () => {
  const built = (await import(new URL("dist/index.js", root).href)) as { renderPreview: typeof renderPreview };
  const [first] = cases;
  assert.ok(first);
  const fromSource = await renderPreview(first.input, first.options);
  const fromBuild = await built.renderPreview(first.input, first.options);
  assert.ok(fromSource.ok && fromBuild.ok);
  assert.ok(Buffer.from(fromSource.png).equals(fromBuild.png));
});
