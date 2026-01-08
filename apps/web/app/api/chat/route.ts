import type { Message } from "@/generated/prisma"
import { prisma } from "@/lib/db"
import { deepseek } from "@ai-sdk/deepseek"
import {
  type LanguageModel,
  type ModelMessage,
  type ToolUIPart,
  type UIMessage,
  convertToModelMessages,
  createGateway,
  streamText,
  tool,
} from "ai"
import { z } from "zod"

export const maxDuration = 30

const SYSTEM_PROMPT = `You are a helpful assistant specialized in creating and modifying Mermaid diagrams.

When the user asks you to create or modify a diagram:
1. Use the update_chart tool to generate or update the Mermaid code
2. Always provide valid Mermaid syntax
3. Explain what you created or changed

If the user is only asking questions, explanations, or analysis about the existing diagram, do not call the update_chart tool.

Supported diagram types:
- flowchart (TD, LR, TB, RL directions)
- sequenceDiagram
- classDiagram
- erDiagram
- stateDiagram-v2
- pie
- gantt
- mindmap

When modifying an existing chart, you will receive the current code. Make incremental changes based on user requests.

Always respond in the same language as the user's message.`

export type ModelId = "claude-sonnet" | "deepseek-chat"

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: "https://ai-gateway.vercel.sh/v1/ai",
})

const MODELS: Record<ModelId, LanguageModel> = {
  "claude-sonnet": gateway("anthropic/claude-sonnet-4-20250514"),
  "deepseek-chat": deepseek("deepseek-chat"),
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const stripUiMessageIds = (messages: UIMessage[]) => messages.map(({ id: _id, ...rest }) => rest)

const parseStoredContent = (content: string): UIMessage["parts"] => {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      return parsed as UIMessage["parts"]
    }
  } catch {
    // Fall through to plain text.
  }

  return content.trim() ? [{ type: "text" as const, text: content }] : []
}

function generateTitle(content: string): string {
  const maxLength = 50
  const cleaned = content.trim().replace(/\s+/g, " ")
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.substring(0, maxLength - 3)}...`
}

const TOOLS = {
  update_chart: tool({
    description:
      "Create or update the Mermaid diagram. Use this whenever the user asks to create, modify, or update a diagram.",
    inputSchema: z.object({
      code: z
        .string()
        .describe("The complete Mermaid diagram code, including the diagram type declaration"),
      description: z.string().describe("Brief description of what was created or changed"),
    }),
    execute: async ({ code, description }: { code: string; description: string }) => {
      return { success: true, code, description }
    },
  }),
}

export async function POST(req: Request) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return new Response("Invalid JSON body", { status: 400 })
  }

  if (!isRecord(payload)) {
    return new Response("Invalid request payload", { status: 400 })
  }

  const { query, currentChart, model, conversationId } = payload

  if (typeof currentChart !== "string" && currentChart !== undefined) {
    return new Response("Invalid request payload", { status: 400 })
  }

  const selectedModelId = (model as ModelId) ?? "deepseek-chat"

  if (typeof query !== "string") {
    return new Response("Invalid request payload", { status: 400 })
  }

  const lastUserText = query.trim()
  if (!lastUserText) {
    return new Response("Invalid request payload", { status: 400 })
  }

  let contextMessages: UIMessage[] = []

  if (typeof conversationId === "string") {
    const storedMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    })

    const parsedStored = storedMessages
      .slice()
      .reverse()
      .map((msg: Pick<Message, "id" | "role" | "content">) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        parts: parseStoredContent(msg.content),
      }))
      .filter((msg: { parts: UIMessage["parts"] }) => msg.parts.length > 0)

    const combined = [
      ...parsedStored,
      {
        id: crypto.randomUUID(),
        role: "user" as const,
        parts: [{ type: "text" as const, text: lastUserText }],
      },
    ]
    contextMessages = combined.slice(-10)
  } else {
    contextMessages = [
      {
        id: crypto.randomUUID(),
        role: "user" as const,
        parts: [{ type: "text" as const, text: lastUserText }],
      },
    ]
  }

  const modelMessages: ModelMessage[] = await convertToModelMessages(
    stripUiMessageIds(contextMessages),
    { tools: TOOLS }
  )

  const systemPrompt =
    typeof currentChart === "string"
      ? `${SYSTEM_PROMPT}\n\nCurrent diagram code:\n\`\`\`mermaid\n${currentChart}\n\`\`\``
      : SYSTEM_PROMPT

  const selectedModel = MODELS[selectedModelId] ?? MODELS["deepseek-chat"]

  const result = streamText({
    model: selectedModel,
    system: systemPrompt,
    messages: modelMessages,
    tools: TOOLS,
    async onFinish({ text, toolCalls, toolResults }) {
      if (typeof conversationId !== "string" || !lastUserText) return

      const now = new Date()

      const messageCount = await prisma.message.count({
        where: { conversationId },
      })

      if (messageCount === 0) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { title: generateTitle(lastUserText) },
        })
      }

      // Save user message
      await prisma.message.create({
        data: {
          conversationId,
          role: "user",
          content: JSON.stringify([{ type: "text", text: lastUserText }]),
        },
      })

      // Build assistant message parts
      const assistantParts: UIMessage["parts"] = []
      if (text) {
        assistantParts.push({ type: "text", text })
      }
      if (toolCalls && toolResults) {
        for (const tc of toolCalls) {
          const res = toolResults.find((tr) => tr.toolCallId === tc.toolCallId)
          assistantParts.push({
            type: `tool-${tc.toolName}` as `tool-${string}`,
            toolCallId: tc.toolCallId,
            state: "output-available",
            input: "input" in tc ? tc.input : undefined,
            output: res && "output" in res ? res.output : undefined,
            errorText:
              res && "errorText" in res ? (res as { errorText?: string }).errorText : undefined,
          } as ToolUIPart)
        }
      }

      const assistantMessage = await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: JSON.stringify(assistantParts),
        },
      })

      const chartToolCall = toolCalls?.find((tc) => tc.toolName === "update_chart")
      if (chartToolCall && "input" in chartToolCall) {
        const input = chartToolCall.input as { code?: string }
        if (input?.code) {
          const latestVersion = await prisma.chartVersion.findFirst({
            where: { conversationId },
            orderBy: { version: "desc" },
            select: { version: true },
          })

          await prisma.chartVersion.create({
            data: {
              conversationId,
              messageId: assistantMessage.id,
              mermaidCode: input.code,
              version: (latestVersion?.version ?? 0) + 1,
            },
          })
        }
      }

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: now },
      })
    },
  })

  return result.toUIMessageStreamResponse()
}
