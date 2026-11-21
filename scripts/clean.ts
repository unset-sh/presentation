// Removes the build folders named on the command line, so a build never keeps a file from an earlier one.
import { rmSync } from "node:fs";

for (const folder of process.argv.slice(2)) {
  rmSync(new URL(`../${folder}`, import.meta.url), { recursive: true, force: true });
}
