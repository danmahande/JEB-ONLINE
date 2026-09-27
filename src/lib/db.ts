import { PrismaClient } from '@prisma/client'

// Namespaced global key — a bare "prisma" key survives every dev-server
// hot reload, which once pinned a stale client that predated a `prisma
// generate` (the running server kept a delegate-less instance and every
// new-model route 500'd until a full process restart). A unique key means
// a regenerated client is always picked up on the next recompile.
const globalForPrisma = globalThis as unknown as {
  __meridianPrisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.__meridianPrisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.__meridianPrisma = db