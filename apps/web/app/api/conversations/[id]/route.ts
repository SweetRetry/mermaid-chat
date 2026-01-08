import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

interface MessagePart {
  type: string
  output?: { code?: string }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const { messages, ...rest } = conversation

  // Parse message content from JSON to restore full message parts
  const parsedMessages = messages.map((msg) => {
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

  // Extract latest chart from messages
  let latestMermaidCode: string | null = null
  for (let i = parsedMessages.length - 1; i >= 0; i--) {
    const msg = parsedMessages[i]
    if (msg?.role !== "assistant") continue
    const parts = msg.parts as MessagePart[]
    const chartPart = parts.find((p) => p.type === "tool-update_chart")
    if (chartPart?.output?.code) {
      latestMermaidCode = chartPart.output.code
      break
    }
  }

  return NextResponse.json({
    ...rest,
    messages: parsedMessages,
    latestChart: latestMermaidCode ? { mermaidCode: latestMermaidCode } : null,
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
