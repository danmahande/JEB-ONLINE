import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

// Namespaced global key — a bare "prisma" key survives every dev-server
// hot reload, which once pinned a stale client that predated a `prisma
// generate` (the running server kept a delegate-less instance and every
// new-model route 500'd until a full process restart). A unique key means
// a regenerated client is always picked up on the next recompile.
const globalForPrisma = globalThis as unknown as {
  __meridianPrisma: PrismaClient | undefined
}

const connectionString: string = process.env.DATABASE_URL ?? ''

if (!connectionString) {
  throw new Error('DATABASE_URL is required to connect to PostgreSQL')
}

const log: ('query' | 'error' | 'warn')[] = process.env.NODE_ENV === 'development'
  ? ['query', 'error', 'warn']
  : ['error']

function createPrismaClient() {
  if (process.env.VERCEL === '1' || connectionString.includes('-pooler.')) {
    return new PrismaClient({
      adapter: new PrismaNeon({ connectionString }),
      log,
    })
  }

  return new PrismaClient({
    datasources: { db: { url: connectionString } },
    log,
  })
}

export const db = globalForPrisma.__meridianPrisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.__meridianPrisma = db
