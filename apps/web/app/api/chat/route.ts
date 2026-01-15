import { volcengine } from "@sweetretry/ai-sdk-volcengine-adapter"
import {
  createUIMessageStreamResponse,
  type FilePart,
  type FileUIPart,
  type ModelMessage,
  streamText,
  type TextPart,
  type TextUIPart,
  type ToolSet,
  type ToolUIPart,
  tool,
  type UIMessage,
  type UIMessageChunk,
} from "ai"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"
import { MEMARID_RULES } from "@/lib/constants/mermaid_rules"
import { conversations, db, type Message, messages } from "@/lib/db"

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a versatile assistant with professional expertise in various fields and a specialized talent for generating diagrams. You help users solve complex problems and visualize information using Mermaid.js. You MUST follow these rules for every diagram you create or modify:

### 🎯 CORE MISSION
- **Versatile Expertise**: Provide high-quality assistance in various domains while leveraging your strength in visualization.
- **Conservative Edits**: Maintain existing layout, node IDs, and styles unless changed.
- **Syntactic Integrity**: Diagrams must be 100% valid and renderable.
- **Multi-lingual**: Respond in the same language as the user.

### 💬 INTERACTION FLOW
Before generating or updating a diagram, evaluate whether the requirements are clear:

**When to ASK first (DO NOT call update_chart yet):**
- The user's request is vague or open-ended (e.g., "help me draw a diagram", "visualize my idea")
- Critical details are missing (e.g., what entities/nodes to include, relationships, diagram type)
- The user is exploring options or brainstorming
- You need to confirm the scope or structure of the diagram

**When to GENERATE directly (call update_chart):**
- The user provides specific, actionable requirements
- The user explicitly asks to "draw", "create", "generate" with clear content
- The user is requesting modifications to an existing diagram with clear instructions
- The user confirms their requirements after your clarifying questions

When asking for clarification, be concise and specific. Offer 2-3 concrete options when appropriate.

### 🛠 TOOL USAGE: \`update_chart\`
- Only call this tool when requirements are sufficiently clear.
- Provide ONLY raw Mermaid code. NEVER wrap in markdown fences.
- Use incremental diffs for updates.

${MEMARID_RULES}`

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

const MODEL_ID = "doubao-seed-1-8-251228"

function getModel() {
  return volcengine(MODEL_ID)
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
      "Create or update the Mermaid diagram. Only use this when the user's requirements are clear and specific. If requirements are vague, ask clarifying questions first.",
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

  const { userMessage, currentChart, thinking, webSearch, conversationId } = payload

  if (typeof currentChart !== "string" && currentChart !== undefined) {
    return new Response("Invalid request payload", { status: 400 })
  }

  if (!Array.isArray(userMessage) || userMessage.length === 0) {
    return new Response("Invalid request payload: missing user message", {
      status: 400,
    })
  }

  const userParts = userMessage as MessagePart[]
  const userText = extractTextFromParts(userParts)

  // Build context messages
  let contextMessages: UIMessage[] = []

  if (typeof conversationId === "string") {
    const storedMessages = await db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(HISTORY_MESSAGES)

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
      {
        id: crypto.randomUUID(),
        role: "user" as const,
        parts: userParts as UIMessage["parts"],
      },
    ].slice(-HISTORY_MESSAGES)
  } else {
    contextMessages = [
      {
        id: crypto.randomUUID(),
        role: "user" as const,
        parts: userParts as UIMessage["parts"],
      },
    ]
  }

  const systemPrompt =
    typeof currentChart === "string"
      ? `${SYSTEM_PROMPT}\n\nCurrent diagram code:\n\`\`\`mermaid\n${currentChart}\n\`\`\``
      : SYSTEM_PROMPT

  const modelMessages = convertToModelMessages(contextMessages)

  const tools =
    webSearch === true
      ? {
          ...TOOLS,
          web_search: volcengine.tools.webSearch({
            maxKeyword: 3,
            limit: 10,
          }),
        }
      : TOOLS

  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    messages: modelMessages,
    tools: tools as unknown as ToolSet,
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

        await db.transaction(async (tx) => {
          const existingMessage = await tx
            .select({ id: messages.id })
            .from(messages)
            .where(eq(messages.conversationId, conversationId))
            .limit(1)

          if (existingMessage.length === 0 && userText) {
            await tx
              .update(conversations)
              .set({ title: generateTitle(userText) })
              .where(eq(conversations.id, conversationId))
          }

          await tx.insert(messages).values([
            { conversationId, role: "user", content: JSON.stringify(userParts) },
            {
              conversationId,
              role: "assistant",
              content: JSON.stringify(assistantParts),
              reasoning: reasoningText || null,
            },
          ])

          await tx
            .update(conversations)
            .set({
              updatedAt: new Date(),
              ...(latestChartCode && { latestChartCode }),
            })
            .where(eq(conversations.id, conversationId))
        })
      } catch (error) {
        console.error("Failed to save messages:", error)
      }
    },
  })

  // Filter out tool-input-delta events to reduce streaming overhead
  const filteredStream = result.toUIMessageStream().pipeThrough(
    new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        if (chunk.type !== "tool-input-delta") {
          controller.enqueue(chunk)
        }
      },
    })
  )

  return createUIMessageStreamResponse({ stream: filteredStream })
}
