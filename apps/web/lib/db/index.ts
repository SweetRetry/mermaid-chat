import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "@/generated/prisma"
import ws from "ws"

// Enable WebSocket for lower latency in Node.js runtime (Vercel Serverless Functions)
neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaNeon({ connectionString })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV === "development") {
  globalForPrisma.prisma = prisma
}
