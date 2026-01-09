import type { Message } from "@/generated/prisma"
import { prisma } from "@/lib/db"
import { deepseek } from "@ai-sdk/deepseek"
import type { LanguageModelV3 } from "@ai-sdk/provider"
import { type ModelMessage, type ToolUIPart, type UIMessage, streamText, tool } from "ai"
import { volcengine } from "ai-sdk-volcengine-adapter"
import { z } from "zod"

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a helpful assistant specialized in creating and modifying Mermaid diagrams.

Core goals:
- Be precise and conservative with edits.
- Preserve all existing nodes, relationships, labels, and textual requirements unless the user explicitly asks to remove or replace them.
- Prefer minimal, targeted changes over rewrites.

When the user asks you to create or modify a diagram:
1. Use the update_chart tool to generate or update the Mermaid code.
2. Always provide valid Mermaid syntax.
3. Explain what you created or changed.
4. Keep the original structure and content unless a change is explicitly requested.
5. If a new request conflicts with prior requirements, ask a clarifying question instead of deleting or altering content.

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

When modifying an existing chart, you will receive the current code. Apply incremental diffs only. Do not refactor or simplify unless asked.

Always respond in the same language as the user's message.`

export type ModelId = "deepseek-chat" | "seed1.8"

function getModel(modelId: ModelId): LanguageModelV3 {
  switch (modelId) {
    case "seed1.8":
      return volcengine('doubao-seed-1-8-251228')
    case "deepseek-chat":
      return deepseek(modelId)
    default:
      return deepseek(modelId)
  }
}

const HISTORY_ROUNDS = 6
const HISTORY_MESSAGES = HISTORY_ROUNDS * 2

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

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

type MessagePart = { type: "text"; text: string } | { type: "file"; mediaType: string; url: string }

function extractTextFromParts(parts: MessagePart[]): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n")
}

/**
 * Convert UIMessages to ModelMessages for DeepSeek (AI SDK format).
 */
function convertToModelMessages(messages: UIMessage[]): ModelMessage[] {
  return messages.map((msg): ModelMessage => {
    const textContent = msg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n")
    return { role: msg.role, content: textContent }
  })
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

  const { userMessage, currentChart, model, conversationId } = payload

  if (typeof currentChart !== "string" && currentChart !== undefined) {
    return new Response("Invalid request payload", { status: 400 })
  }

  if (!Array.isArray(userMessage) || userMessage.length === 0) {
    return new Response("Invalid request payload: missing user message", { status: 400 })
  }

  const selectedModelId = (model as ModelId) ?? "deepseek-chat"
  const userParts = userMessage as MessagePart[]
  const userText = extractTextFromParts(userParts)

  // Build context messages
  let contextMessages: UIMessage[] = []

  if (typeof conversationId === "string") {
    const storedMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_MESSAGES,
      select: { id: true, role: true, content: true },
    })

    const parsedStored = storedMessages
      .slice()
      .reverse()
      .map((msg: Pick<Message, "id" | "role" | "content">) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        parts: parseStoredContent(msg.content),
      }))
      .filter((msg) => msg.parts.length > 0)

    contextMessages = [
      ...parsedStored,
      { id: crypto.randomUUID(), role: "user" as const, parts: userParts as UIMessage["parts"] },
    ].slice(-HISTORY_MESSAGES)
  } else {
    contextMessages = [
      { id: crypto.randomUUID(), role: "user" as const, parts: userParts as UIMessage["parts"] },
    ]
  }

  const systemPrompt =
    typeof currentChart === "string"
      ? `${SYSTEM_PROMPT}\n\nCurrent diagram code:\n\`\`\`mermaid\n${currentChart}\n\`\`\``
      : SYSTEM_PROMPT

  const modelMessages = convertToModelMessages(contextMessages)

  const result = streamText({
    model: getModel(selectedModelId),
    system: systemPrompt,
    messages: modelMessages,
    tools: TOOLS,
    async onFinish({ text, toolCalls, toolResults }) {
      if (typeof conversationId !== "string" || userParts.length === 0) return

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
          } as ToolUIPart)
        }
      }

      let latestChartCode: string | undefined
      if (toolResults) {
        const chartResult = toolResults.find((tr) => tr.toolName === "update_chart")
        if (chartResult && "output" in chartResult) {
          const output = chartResult.output as { code?: string }
          if (output?.code) {
            latestChartCode = output.code
          }
        }
      }

      await prisma.$transaction(async (tx) => {
        const existingMessage = await tx.message.findFirst({
          where: { conversationId },
          select: { id: true },
        })

        if (!existingMessage && userText) {
          await tx.conversation.update({
            where: { id: conversationId },
            data: { title: generateTitle(userText) },
          })
        }

        await tx.message.createMany({
          data: [
            { conversationId, role: "user", content: JSON.stringify(userParts) },
            { conversationId, role: "assistant", content: JSON.stringify(assistantParts) },
          ],
        })

        await tx.conversation.update({
          where: { id: conversationId },
          data: {
            updatedAt: new Date(),
            ...(latestChartCode && { latestChartCode }),
          },
        })
      })
    },
  })

  return result.toUIMessageStreamResponse()
}
