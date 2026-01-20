import { desc } from "drizzle-orm"
import { NextResponse } from "next/server"
import { conversations, db } from "@/lib/db"

export async function GET() {
  const result = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
      charts: conversations.charts,
    })
    .from(conversations)
    .orderBy(desc(conversations.updatedAt))

  return NextResponse.json({ conversations: result })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const title =
    typeof body.title === "string" && body.title.trim() ? body.title.trim() : "New Conversation"

  const [conversation] = await db.insert(conversations).values({ title }).returning()

  return NextResponse.json(conversation, { status: 201 })
}
