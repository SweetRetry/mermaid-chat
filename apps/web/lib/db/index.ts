import { neon, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import ws from "ws"
import * as schema from "./schema"

// Enable WebSocket for lower latency in Node.js runtime (Vercel Serverless Functions)
neonConfig.webSocketConstructor = ws

const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, { schema })

export * from "./schema"
