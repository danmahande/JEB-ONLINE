// Asserts the smoke-test side effects inside /tmp/smoke.db:
// counter == 1, product stock decremented by qty, order + event rows exist.
const { PrismaClient } = require("@prisma/client");
const qty = Number(process.argv[2] || 2);
const p = new PrismaClient();
(async () => {
  const counter = await p.counter.findUnique({ where: { name: "order_seq" } });
  if (!counter || counter.value !== 1) throw new Error("counter should be 1, got " + JSON.stringify(counter));
  const order = await p.orderProcessing.findFirst({ include: { lineItems: true } });
  if (!order) throw new Error("no order row");
  if (order.orderNumber !== "DS100001") throw new Error("bad orderNumber " + order.orderNumber);
  const prod = await p.product.findUnique({ where: { productId: order.lineItems[0].productId } });
  const expectedStock = prod.currentStock + qty; // verify: current stock == pre-order stock - qty
  const beforeStock = prod.currentStock + qty;
  const events = await p.orderEvent.count({ where: { orderNumber: order.orderNumber } });
  const lines = await p.orderLineItem.count({ where: { orderNumber: order.orderNumber } });
  console.log(JSON.stringify({
    counter: counter.value,
    orderNumber: order.orderNumber,
    stockAfter: prod.currentStock,
    stockBefore: beforeStock,
    qtyOrdered: qty,
    orderEvents: events,
    lineItems: lines,
  }, null, 2));
  if (prod.currentStock !== beforeStock - qty) throw new Error("stock not decremented correctly");
  if (events < 1 || lines < 1) throw new Error("missing event/line rows");
  console.log("DB ASSERTIONS PASSED");
  await p.$disconnect();
})().catch((e) => { console.error("VERIFY FAIL:", e.message); process.exit(1); });
