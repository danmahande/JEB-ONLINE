/**
 * Regenerate problematic images with strict no-text packaging prompts.
 */
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUT = path.resolve(process.cwd(), "public/products");

const STYLE =
  "professional e-commerce product photography, single product centered on flat seamless light gray studio background, soft overhead studio lighting with one hard shadow, no people, no props, completely blank unlabeled packaging with absolutely no text, no letters, no numbers, no logos, no printing, no writing anywhere on the product, hyper realistic, high detail";

const JOBS: [string, string][] = [
  ["maize-flour-posho", "a large 25kg white woven polypropylene sack filled with white maize flour, stitched top closure, empty blank sack surface"],
  ["portland-cement", "a tall 50kg plain dark gray paper cement bag, square sturdy paper sack shape, matte concrete-gray paper surface"],
  ["g30-iron-sheets", "a neat flat stack of corrugated galvanized steel roofing sheets viewed from the side, charcoal black corrugated profiles stacked evenly on top of each other"],
  ["long-grain-rice", "a large 25kg woven polypropylene sack filled with polished white long-grain rice, open stitched top showing rice grains, blank cream colored sack"],
  ["sugar-beans-rose-coco", "an open white woven poly bag filled with dried red-speckled kidney beans spilling slightly over the top edge"],
  ["wheat-flour", "a tall 25kg plain kraft paper flour bag, blank brown paper sack with folded top"],
];

async function main() {
  const zai = await ZAI.create();
  for (const [slug, subject] of JOBS) {
    const out = path.join(OUT, `${slug}.png`);
    let ok = false;
    for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
      try {
        const res = await zai.images.generations.create({
          prompt: `${subject}, ${STYLE}`,
          size: "1024x1024",
        });
        const b64 = res?.data?.[0]?.base64;
        if (!b64) throw new Error("empty response");
        // backup old, write new
        if (fs.existsSync(out)) fs.renameSync(out, out + ".bak");
        fs.writeFileSync(out, Buffer.from(b64, "base64"));
        ok = true;
        console.log(`ok ${slug}`);
      } catch (e: any) {
        console.error(`FAIL ${slug} attempt ${attempt}: ${e.message}`);
        await new Promise((r) => setTimeout(r, 12000 * attempt));
      }
    }
  }
  console.log("REGEN DONE");
}
main();
