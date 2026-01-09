import type { Message } from "@/generated/prisma"
import { prisma } from "@/lib/db"
import {
  FilePart,
  FileUIPart,
  type ModelMessage,
  TextPart,
  TextUIPart,
  type ToolUIPart,
  type UIMessage,
  streamText,
  tool,
} from "ai"
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

IMPORTANT: When providing code to the update_chart tool:
- Do NOT wrap the code in markdown code fences (\`\`\`mermaid or \`\`\`)
- Provide ONLY the raw Mermaid diagram code starting with the diagram type (e.g., "flowchart TD", "sequenceDiagram", etc.)

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

/**
 * Strip markdown code fences from mermaid code if present.
 * Handles both \`\`\`mermaid ... \`\`\` and \`\`\` ... \`\`\` formats.
 */
function stripCodeFences(code: string): string {
  const trimmed = code.trim()
  // Match ```mermaid or just ``` at the start, and ``` at the end
  const match = trimmed.match(/^```(?:mermaid)?\s*\n?([\s\S]*?)\n?```$/i)
  return match?.[1]?.trim() ?? trimmed
}

export type ModelId = "seed1.8"

const MODEL_MAP: Record<ModelId, string> = {
  "seed1.8": "doubao-seed-1-8-251228",
}

function getModel(modelId: ModelId) {
  return volcengine(MODEL_MAP[modelId] ?? MODEL_MAP["seed1.8"])
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
        .describe(
          "Raw Mermaid diagram code WITHOUT markdown code fences. Must start directly with diagram type (e.g., 'flowchart TD', 'sequenceDiagram'). Do NOT include ``` or ```mermaid."
        ),
      description: z.string().describe("Brief description of what was created or changed"),
    }),
    execute: async ({ code, description }: { code: string; description: string }) => {
      // Strip markdown code fences if the AI included them
      const cleanCode = stripCodeFences(code)
      return { success: true, code: cleanCode, description }
    },
  }),
}

type MessagePart = TextUIPart | FileUIPart

type ModelContentPart = TextPart | FilePart

function extractTextFromParts(parts: MessagePart[]): string {
  return parts
    .filter((p): p is TextUIPart => p.type === "text")
    .map((p) => p.text)
    .join("\n")
}

/**
 * Convert UIMessages to ModelMessages with multimodal support.
 * Files use type: "file" with data and mediaType (AI SDK V3 format).
 */
function convertToModelMessages(messages: UIMessage[]): ModelMessage[] {
  return messages.map((msg): ModelMessage => {
    const contentParts: ModelContentPart[] = []

    for (const part of msg.parts) {
      if (part.type === "text") {
        contentParts.push({ type: "text", text: part.text })
      } else if (part.type === "file") {
        const filePart = part as { type: "file"; mediaType: string; url: string }
        // Images and videos as file parts with data and mediaType
        if (filePart.mediaType.startsWith("image/") || filePart.mediaType.startsWith("video/")) {
          contentParts.push({
            type: "file",
            data: filePart.url,
            mediaType: filePart.mediaType,
          })
        }
      }
    }

    // If no content parts, return empty text
    if (contentParts.length === 0) {
      return { role: msg.role, content: "" }
    }

    // If only text parts, return as simple string for compatibility
    if (contentParts.every((p) => p.type === "text")) {
      return {
        role: msg.role,
        content: contentParts.map((p) => (p as { type: "text"; text: string }).text).join("\n"),
      }
    }

    // Return multimodal content
    return { role: msg.role, content: contentParts } as ModelMessage
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

  const { userMessage, currentChart, model, thinking, conversationId } = payload

  if (typeof currentChart !== "string" && currentChart !== undefined) {
    return new Response("Invalid request payload", { status: 400 })
  }

  if (!Array.isArray(userMessage) || userMessage.length === 0) {
    return new Response("Invalid request payload: missing user message", { status: 400 })
  }

  const selectedModelId = (model as ModelId) ?? "seed1.8"
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
    providerOptions: {
      volcengine: {
        thinking: thinking === true,
      },
    },
    async onFinish({ text, reasoning, toolCalls, toolResults }) {
      if (typeof conversationId !== "string" || userParts.length === 0) return

      try {
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

        // Extract reasoning text from reasoning parts
        const reasoningText = reasoning
          ?.filter((r): r is { type: "reasoning"; text: string } => r.type === "reasoning")
          .map((r) => r.text)
          .join("")

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
              {
                conversationId,
                role: "assistant",
                content: JSON.stringify(assistantParts),
                reasoning: reasoningText || null,
              },
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
      } catch (error) {
        console.error("Failed to save messages:", error)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
