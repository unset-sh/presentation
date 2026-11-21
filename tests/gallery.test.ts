// Every gallery case, compared with the drawing kept in gallery/expected/. A change to a template, to the brand
// package or to the renderer shows up here as a changed picture, and `npm run gallery:update` records it on purpose.

import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { cases } from "../gallery/cases.ts";
import { renderPreview } from "../src/index.ts";

const expected = new URL("../gallery/expected/", import.meta.url);
const out = new URL("../gallery/out/", import.meta.url);

for (const { id, input, options } of cases) {
  test(`${id} matches its expected drawing`, async () => {
    const result = await renderPreview(input, options);
    assert.ok(result.ok, result.ok ? "" : result.reason);
    const kept = readFileSync(new URL(`${id}.png`, expected));
    if (kept.equals(result.png)) return;
    mkdirSync(out, { recursive: true });
    writeFileSync(new URL(`${id}.png`, out), result.png);
    assert.fail(
      `${id} changed. Compare gallery/out/${id}.png with gallery/expected/${id}.png, then run npm run gallery:update.`,
    );
  });
}

test("case ids are unique and every expected drawing has a case", () => {
  const ids = cases.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(readdirSync(expected).sort(), ids.map((id) => `${id}.png`).sort());
});
