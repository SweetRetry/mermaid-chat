import { conversations, db } from "@/lib/db"
import { desc } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const result = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .orderBy(desc(conversations.updatedAt))

  return NextResponse.json({ conversations: result })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const title =
    typeof body.title === "string" && body.title.trim() ? body.title.trim() : "New Conversation"

  const now = new Date()
  const id = crypto.randomUUID()

  await db.insert(conversations).values({
    id,
    title,
    createdAt: now,
    updatedAt: now,
  })

  return NextResponse.json({ id, title, createdAt: now, updatedAt: now }, { status: 201 })
}
