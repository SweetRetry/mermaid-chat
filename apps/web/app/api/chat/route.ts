import { chartVersions, conversations, db, messages } from "@/lib/db"
import { deepseek } from "@ai-sdk/deepseek"
import {
  type LanguageModel,
  type ModelMessage,
  type Tool,
  type UIMessage,
  convertToModelMessages,
  createGateway,
  safeValidateUIMessages,
  streamText,
  tool,
} from "ai"
import { desc, eq, sql } from "drizzle-orm"
import { z } from "zod"

export const maxDuration = 30

const SYSTEM_PROMPT = `You are a helpful assistant specialized in creating and modifying Mermaid diagrams.

When the user asks you to create or modify a diagram:
1. Use the update_chart tool to generate or update the Mermaid code
2. Always provide valid Mermaid syntax
3. Explain what you created or changed

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

const UI_TOOLS = TOOLS as Record<string, Tool<unknown, unknown>>

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

  const { messages: payloadMessages, currentChart, model, conversationId } = payload

  if (currentChart !== undefined && typeof currentChart !== "string") {
    return new Response("Invalid request payload", { status: 400 })
  }

  if (model !== undefined && typeof model !== "string") {
    return new Response("Invalid request payload", { status: 400 })
  }

  if (conversationId !== undefined && typeof conversationId !== "string") {
    return new Response("Invalid request payload", { status: 400 })
  }

  const selectedModelId = model ?? "deepseek-chat"

  const validatedMessages = await safeValidateUIMessages({
    messages: payloadMessages,
    tools: UI_TOOLS,
  })
  if (!validatedMessages.success) {
    return new Response("Invalid request payload", { status: 400 })
  }

  // Limit context window to last 6 conversation turns (12 messages)
  const recentMessages = validatedMessages.data.slice(-12)

  const modelMessages: ModelMessage[] = await convertToModelMessages(
    stripUiMessageIds(recentMessages),
    { tools: TOOLS }
  )

  const systemPrompt = currentChart
    ? `${SYSTEM_PROMPT}\n\nCurrent diagram code:\n\`\`\`mermaid\n${currentChart}\n\`\`\``
    : SYSTEM_PROMPT

  const selectedModel = MODELS[selectedModelId as ModelId] ?? MODELS["deepseek-chat"]

  const lastUserMessage = [...validatedMessages.data]
    .reverse()
    .find((m: UIMessage) => m.role === "user")

  const result = streamText({
    model: selectedModel,
    system: systemPrompt,
    messages: modelMessages,
    tools: TOOLS,
    async onFinish({ text, toolCalls, toolResults }) {
      if (!conversationId || !lastUserMessage) return

      const now = new Date()

      const existingMessages = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.conversationId, conversationId))

      const extractTextFromParts = (parts: UIMessage["parts"]): string => {
        return parts
          .filter(
            (p): p is { type: "text"; text: string } =>
              typeof p === "object" && p !== null && p.type === "text" && "text" in p
          )
          .map((p) => p.text)
          .join("")
      }

      const userTextContent = extractTextFromParts(lastUserMessage.parts)

      if (existingMessages[0]?.count === 0 && userTextContent) {
        await db
          .update(conversations)
          .set({ title: generateTitle(userTextContent) })
          .where(eq(conversations.id, conversationId))
      }

      // Save user message with full parts
      await db.insert(messages).values({
        id: crypto.randomUUID(),
        conversationId,
        role: "user",
        content: JSON.stringify(lastUserMessage.parts),
        createdAt: now,
      })

      // Build assistant message parts including tool calls
      const assistantParts: unknown[] = []
      if (text) {
        assistantParts.push({ type: "text", text })
      }
      if (toolCalls && toolResults) {
        for (const tc of toolCalls) {
          const result = toolResults.find((tr) => tr.toolCallId === tc.toolCallId)
          assistantParts.push({
            type: "tool-invocation",
            toolInvocation: {
              state: "result",
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              args: "input" in tc ? tc.input : undefined,
              result: result && "output" in result ? result.output : undefined,
            },
          })
        }
      }

      const assistantMessageId = crypto.randomUUID()
      await db.insert(messages).values({
        id: assistantMessageId,
        conversationId,
        role: "assistant",
        content: JSON.stringify(assistantParts),
        createdAt: now,
      })

      const chartToolCall = toolCalls?.find((tc) => tc.toolName === "update_chart")
      if (chartToolCall && "input" in chartToolCall) {
        const input = chartToolCall.input as { code?: string }
        if (input?.code) {
          const latestVersion = await db
            .select({ version: chartVersions.version })
            .from(chartVersions)
            .where(eq(chartVersions.conversationId, conversationId))
            .orderBy(desc(chartVersions.version))
            .limit(1)

          await db.insert(chartVersions).values({
            id: crypto.randomUUID(),
            conversationId,
            messageId: assistantMessageId,
            mermaidCode: input.code,
            version: (latestVersion[0]?.version ?? 0) + 1,
            createdAt: now,
          })
        }
      }

      await db
        .update(conversations)
        .set({ updatedAt: now })
        .where(eq(conversations.id, conversationId))
    },
  })

  return result.toUIMessageStreamResponse()
}
