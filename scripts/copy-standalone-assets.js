/*
 * Copy static assets into the standalone output after `next build`.
 * Cross-platform replacement for:
 *   cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
 * Added in round 19: package.json was repointed at this script by the
 * agent-host commit 59ac7e6 without the script itself ever being
 * committed — `npm run build` failed with MODULE_NOT_FOUND until this
 * file landed (auditor repair, see AGENT-FIXLIST.md ROUND 19).
 */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(root, ".next", "standalone", ".next", "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(root, ".next", "standalone", "public");

for (const [src, dest] of [
  [staticSrc, staticDest],
  [publicSrc, publicDest],
]) {
  if (!fs.existsSync(src)) {
    console.error(`copy-standalone-assets: missing ${path.relative(root, src)} — run \`next build\` first`);
    process.exit(1);
  }
  fs.cpSync(src, dest, { recursive: true });
  console.log(`copy-standalone-assets: ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
}
