import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const PROMPT =
  "Remove all printed text, numbers and lettering from the packaging completely. " +
  "Keep the bag, the grain inside, the lighting, the neutral gray studio background " +
  "and the overall composition exactly identical. The packaging must be plain and " +
  "unprinted, photorealistic product photography.";

const JOBS = [
  {
    src: "public/products/wheat-flour.png",
    out: "public/products/wheat-flour.png",
  },
  {
    src: "public/products/soybeans.png",
    out: "public/products/soybeans.png",
  },
];

async function main() {
  const zai = await ZAI.create();

  for (const job of JOBS) {
    const abs = new URL(`../${job.src}`, import.meta.url).pathname;
    const b64 = fs.readFileSync(abs).toString("base64");
    const dataUrl = `data:image/png;base64,${b64}`;

    process.stdout.write(`editing ${job.src} ... `);
    const res = await zai.images.generations.edit({
      prompt: PROMPT,
      images: [{ url: dataUrl }],
      size: "1024x1024",
    });

    const outB64 = res?.data?.[0]?.base64;
    if (!outB64) throw new Error(`no image returned for ${job.src}`);
    fs.writeFileSync(abs, Buffer.from(outB64, "base64"));
    console.log(`saved (${Math.round(outB64.length * 0.75 / 1024)} KB)`);
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
