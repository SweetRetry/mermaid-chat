import { chartVersions, conversations, db, messages } from "@/lib/db"
import { asc, desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  })

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const conversationMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt))

  const latestChartVersions = await db
    .select()
    .from(chartVersions)
    .where(eq(chartVersions.conversationId, id))
    .orderBy(desc(chartVersions.version))
    .limit(1)

  // Parse message content from JSON to restore full message parts
  const parsedMessages = conversationMessages.map((msg) => {
    let parts: unknown[]
    try {
      parts = JSON.parse(msg.content)
      if (!Array.isArray(parts)) {
        // Legacy format: plain text content
        parts = [{ type: "text", text: msg.content }]
      }
    } catch {
      // Legacy format: plain text content
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
    ...conversation,
    messages: parsedMessages,
    latestChart: latestChartVersions[0] ?? null,
  })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const now = new Date()
  await db
    .update(conversations)
    .set({
      title: body.title.trim(),
      updatedAt: now,
    })
    .where(eq(conversations.id, id))

  const updated = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  })

  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params

  await db.delete(conversations).where(eq(conversations.id, id))

  return NextResponse.json({ success: true })
}
