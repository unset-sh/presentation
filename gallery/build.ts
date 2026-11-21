// Draws every gallery case. `npm run gallery` writes them to gallery/out/ with a page to look at them on;
// `npm run gallery:update` rewrites gallery/expected/, which the snapshot test compares against.

import { mkdirSync, writeFileSync } from "node:fs";
import { renderPreview } from "../src/index.ts";
import { cases } from "./cases.ts";

const update = process.argv.includes("--update");
const folder = new URL(update ? "./expected/" : "./out/", import.meta.url);
mkdirSync(folder, { recursive: true });

const failed: string[] = [];
for (const { id, input, options } of cases) {
  const result = await renderPreview(input, options);
  if (result.ok) writeFileSync(new URL(`${id}.png`, folder), result.png);
  else failed.push(`${id}: ${result.reason}${result.field ? ` (${result.field})` : ""}`);
}

if (!update) {
  const figures = cases.map(
    ({ id }) => `<figure><img src="${id}.png" width="600" height="315" alt=""><figcaption>${id}</figcaption></figure>`,
  );
  const page = `<!doctype html><meta charset="utf-8"><title>presentation gallery</title>
<style>body{font:14px system-ui;margin:24px;background:Canvas;color:CanvasText;color-scheme:light dark}
main{display:grid;grid-template-columns:repeat(auto-fill,600px);gap:24px}figure{margin:0}img{display:block;border:1px solid GrayText}</style>
<main>${figures.join("\n")}</main>\n`;
  writeFileSync(new URL("index.html", folder), page);
}

if (failed.length > 0) {
  process.stderr.write(`${failed.join("\n")}\n`);
  process.exitCode = 1;
}
