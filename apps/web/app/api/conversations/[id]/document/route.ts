import { prisma } from "@/lib/db"
import { streamText } from "ai"
import { volcengine } from "@sweetretry/ai-sdk-volcengine-adapter"
import { NextResponse } from "next/server"

export const maxDuration = 60

interface RouteParams {
  params: Promise<{ id: string }>
}

const SYSTEM_PROMPT = `You are a technical documentation expert. Convert Mermaid diagram code into clear, well-structured Markdown documentation.

Guidelines:
1. Analyze the diagram structure and relationships
2. Create a logical document structure with proper headings
3. Explain each component and their relationships
4. Use bullet points and numbered lists for clarity
5. Include a summary section at the beginning
6. Respond in the same language as the diagram labels (if Chinese labels, respond in Chinese)

Output format:
- Use proper Markdown syntax
- Include h2 (##) for main sections
- Use code blocks for technical terms if needed
- Keep explanations concise but comprehensive`

/**
 * POST: Generate document from chart code (streaming)
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { latestChartCode: true },
  })

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  if (!conversation.latestChartCode) {
    return NextResponse.json({ error: "No chart code available" }, { status: 400 })
  }

  const result = streamText({
    model: volcengine("doubao-seed-1-8-251228"),
    system: SYSTEM_PROMPT,
    prompt: `Please convert this Mermaid diagram into comprehensive documentation:\n\n\`\`\`mermaid\n${conversation.latestChartCode}\n\`\`\``,
    async onFinish({ text }) {
      // Persist the generated document
      await prisma.conversation.update({
        where: { id },
        data: { document: text },
      })
    },
  })

  return result.toTextStreamResponse()
}

/**
 * PATCH: Update document content directly (for manual edits)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  if (typeof body.document !== "string") {
    return NextResponse.json({ error: "Document content is required" }, { status: 400 })
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: { document: body.document },
  })

  return NextResponse.json({ document: updated.document })
}

/**
 * DELETE: Clear document
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params

  await prisma.conversation.update({
    where: { id },
    data: { document: null },
  })

  return NextResponse.json({ success: true })
}
