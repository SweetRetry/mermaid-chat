import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const result = await prisma.conversation.findMany({
    select: {
      id: true,
      title: true,
      updatedAt: true,
      latestChartCode: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return NextResponse.json({ conversations: result })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const title =
    typeof body.title === "string" && body.title.trim() ? body.title.trim() : "New Conversation"

  const conversation = await prisma.conversation.create({
    data: { title },
  })

  return NextResponse.json(conversation, { status: 201 })
}
