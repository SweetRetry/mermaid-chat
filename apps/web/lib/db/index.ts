import { Pool, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"
import ws from "ws"
import * as schema from "./schema"

// Enable WebSocket for transaction support in Node.js runtime
neonConfig.webSocketConstructor = ws

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const db = drizzle(pool, { schema })

export * from "./schema"
