import type { Message } from "@/generated/prisma"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params

  const conversation = await prisma.conversation.findUnique({
    where: { id },
  })

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const conversationMessages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  })

  const latestChartVersion = await prisma.chartVersion.findFirst({
    where: { conversationId: id },
    orderBy: { version: "desc" },
  })

  // Parse message content from JSON to restore full message parts
  const parsedMessages = conversationMessages.map((msg: Message) => {
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
    ...conversation,
    messages: parsedMessages,
    latestChart: latestChartVersion ?? null,
  })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: { title: body.title.trim() },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params

  await prisma.conversation.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
