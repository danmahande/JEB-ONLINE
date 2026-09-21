/**
 * Batch product image generation — catalog shots.
 * Flat light-gray seamless backdrop, centered product, hard shadow.
 */
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUT = path.resolve(process.cwd(), "public/products");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const STYLE =
  "professional e-commerce product photography, single product centered on flat seamless light gray studio background, soft overhead studio lighting with one hard shadow, no people, no props, no text, no watermark, hyper realistic, high detail, 4k";

const JOBS = [
  ["maize-flour-posho", "a 25kg woven polypropylene sack of white maize flour, plain white sack with simple black stenciled text block, stitched top"],
  ["long-grain-rice", "a 25kg woven polypropylene sack of white long grain rice, plain cream colored sack, stitched top"],
  ["sugar-beans-rose-coco", "an open 25kg white poly bag of dried red-speckled rose coco sugar beans spilling slightly at top"],
  ["sorghum", "a 50kg plain jute sack filled with red sorghum grain, top tied open showing grain"],
  ["wheat-flour", "a 25kg plain kraft paper bag of white wheat flour, tall rectangular paper sack"],
  ["finger-millet", "a 25kg plain sack of tiny amber finger millet grain, open top showing grain"],
  ["soybeans", "a 50kg plain white sack of dried yellow soybeans, open top showing round beans"],
  ["portland-cement", "a 50kg portland cement paper bag, plain dark gray bag with simple black block text, sturdy square paper sack"],
  ["g30-iron-sheets", "a stack of corrugated galvanized steel roofing sheets, charcoal black corrugated profile, three stacked sheets leaning"],
  ["common-nails", "a 25kg brown cardboard carton filled with shiny steel wire common nails spilling from open top"],
  ["claw-hammer-16oz", "a forged steel claw hammer with black rubber grip handle, lying diagonally"],
  ["heavy-duty-wheelbarrow", "a heavy duty steel wheelbarrow with black seamless tray and pneumatic wheel, three-quarter view"],
  ["steel-padlock-50mm", "a laminated steel padlock with brass cylinder keyhole and three steel keys, closed shackle"],
  ["round-mouth-shovel", "a round mouth shovel with pressed steel blade and wooden shaft with YD handle grip, standing upright"],
  ["__hero", "dramatic wide black and white photograph of towering stacked grain sacks and bundled steel roofing sheets inside a vast empty concrete warehouse, hard side light through tall windows, deep shadows, industrial brutalist composition, film grain, high contrast monochrome, no people, no text"],
];

async function main() {
  const zai = await ZAI.create();
  let done = 0;
  const queue = JOBS.filter(([slug]) => {
    const p = path.join(OUT, `${slug}.png`);
    if (fs.existsSync(p) && fs.statSync(p).size > 10000) {
      done++;
      console.log(`skip existing ${slug}`);
      return false;
    }
    return true;
  });
  console.log(`pending: ${queue.length}`);
  const CONCURRENCY = 2;
  let failed = 0;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function worker(id: number) {
    await sleep(id * 3000);
    while (queue.length) {
      const job = queue.shift();
      if (!job) return;
      const [slug, subject] = job;
      const out = path.join(OUT, `${slug}.png`);
      const size = slug === "__hero" ? "1440x720" : "1024x1024";
      const prompt = slug === "__hero" ? `${subject}, cinematic, extremely detailed` : `${subject}, ${STYLE}`;
      let attempt = 0;
      while (attempt < 5) {
        try {
          const res = await zai.images.generations.create({ prompt, size });
          const b64 = res?.data?.[0]?.base64;
          if (!b64) throw new Error("empty response");
          fs.writeFileSync(out, Buffer.from(b64, "base64"));
          done++;
          console.log(`[w${id}] ok ${slug} (${done}/${JOBS.length})`);
          break;
        } catch (e: any) {
          attempt++;
          const backoff = 15000 * attempt;
          console.error(`[w${id}] FAIL ${slug} attempt ${attempt}: ${e.message} — retry in ${backoff / 1000}s`);
          await sleep(backoff);
        }
      }
      if (attempt >= 5) {
        failed++;
        console.error(`[w${id}] GIVE UP ${slug}`);
      }
      await sleep(2000);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));
  console.log(`DONE ok=${done} failed=${failed}`);
}

main();
