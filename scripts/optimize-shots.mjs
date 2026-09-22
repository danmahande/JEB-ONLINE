import sharp from "sharp";
import { readdir, rename, unlink } from "fs/promises";
import { join } from "path";

const dir = "/home/z/my-project/docs/screenshots";
const files = (await readdir(dir)).filter((f) => f.endsWith(".png"));

for (const f of files) {
  const src = join(dir, f);
  const tmp = src.replace(".png", ".opt.png");
  await sharp(src)
    .resize({ width: 1200 })
    .png({ palette: true, quality: 92, compressionLevel: 9 })
    .toFile(tmp);
  const { size } = await import("fs/promises").then((m) => m.stat(tmp));
  await unlink(src);
  await rename(tmp, src);
  console.log(`${f}: ${(size / 1024).toFixed(0)} KB optimized`);
}
