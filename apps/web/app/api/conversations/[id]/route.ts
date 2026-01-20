import { asc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { conversations, db, messages, type ChartsData } from "@/lib/db"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: {
      messages: {
        orderBy: asc(messages.createdAt),
      },
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const { messages: msgs, charts, ...rest } = conversation

  // Parse message content from JSON to restore full message parts
  const parsedMessages = msgs.map((msg) => {
    let parts: unknown[]
    try {
      parts = JSON.parse(msg.content)
      if (!Array.isArray(parts)) {
        parts = [{ type: "text", text: msg.content }]
      }
    } catch {
      parts = [{ type: "text", text: msg.content }]
    }
    return {
      id: msg.id,
      role: msg.role,
      parts,
      createdAt: msg.createdAt,
    }
  })

  return NextResponse.json({
    ...rest,
    messages: parsedMessages,
    charts: (charts as ChartsData) ?? null,
  })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const [updated] = await db
    .update(conversations)
    .set({ title: body.title.trim() })
    .where(eq(conversations.id, id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params

  await db.delete(conversations).where(eq(conversations.id, id))

  return NextResponse.json({ success: true })
}
