// What gets published: the built code and nothing else, and it draws the same as the source.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { test } from "node:test";
import { cases } from "../gallery/cases.ts";
import { renderPreview } from "../src/index.ts";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("package.json", root), "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

test("the package holds the built code, the licence and the readme, and no test", () => {
  // Pack for real into a scratch folder and list the archive, so the test reads what would be published.
  const folder = mkdtempSync(join(tmpdir(), "rendering-pack-"));
  try {
    const name = execFileSync("bun", ["pm", "pack", "--ignore-scripts", "--quiet", "--destination", folder], {
      cwd: root,
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .at(-1);
    assert.ok(name, "bun pm pack named no archive");
    const listing = execFileSync("tar", ["-tzf", join(folder, basename(name))], { encoding: "utf8" });
    const paths = listing
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^package\//, ""));
    const outside = paths.filter((path) => !path.startsWith("dist/")).sort();
    assert.deepEqual(outside, ["LICENSE", "README.md", "package.json"]);
    assert.ok(paths.includes("dist/index.js") && paths.includes("dist/index.d.ts"));
    assert.deepEqual(
      paths.filter((path) => path.includes(".test.")),
      [],
    );
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
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
