// Picks an active product with stock from the DB pointed at by DATABASE_URL.
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const prod = await p.product.findFirst({
    where: { isActive: true, currentStock: { gte: 1 } },
    orderBy: { productId: "asc" },
    select: { productId: true, currentStock: true, productLabel: true },
  });
  if (!prod) { console.error("no active product with stock"); process.exit(1); }
  console.log(JSON.stringify(prod));
  await p.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
