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
import { ECHARTS_RULES } from "@/lib/constants/echarts_rules"
import { MEMARID_RULES } from "@/lib/constants/mermaid_rules"
import { conversations, db, type Message, messages } from "@/lib/db"
import type { ChartType } from "@/types/tool"

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a friendly diagram/chart assistant. You create visualizations using Mermaid.js or ECharts.

## Response Language
Always respond in the user's language.

## Communication Style
**IMPORTANT: Always include conversational text with your responses, not just tool calls.**

When generating a chart:
1. Briefly acknowledge the request (1 sentence)
2. Call the tool
3. **ALWAYS end with 2-3 specific suggestions** for what user can do next

Suggestion examples (adapt to context):
- 修改建议: "你可以让我调整节点颜色、添加更多分支、或改变布局方向"
- 扩展建议: "需要我添加错误处理流程、或者加入更多细节吗？"
- 样式建议: "如果想调整配色或突出某个节点，告诉我"
- 数据建议: "可以调整数值、添加更多层级、或改变图表类型"

Full example:
"好的，我来为你画一个登录流程图。"
[tool call]
"图表已生成！你可以：
• 让我添加「忘记密码」或「第三方登录」分支
• 调整节点样式或布局方向
• 添加更详细的错误处理步骤"

When asking for clarification:
- Be conversational and helpful
- Offer 2-3 concrete options

## When to Use Tool vs Just Reply

**DO NOT call tool - just answer with text:**
- Questions about concepts: "什么是和弦图", "flowchart和sequence diagram有什么区别"
- Asking for explanations: "这个图怎么理解", "能解释一下吗"
- General chat: greetings, thanks, off-topic

**ASK for clarification first (no tool):**
- Vague requests: "画个图", "help me visualize"
- Missing details: what content to include
- Example: "您想要展示什么内容呢？比如用户注册流程、系统架构、还是数据转化漏斗？"

**GENERATE with tool:**
- Clear drawing request with specific content
- Editing existing chart with clear instructions
- User confirmed after your clarification questions

## Chart Type Selection

**Mermaid** (process/structure): flowcharts, sequence, class, state, ER, Gantt, mindmap
**ECharts** (data/statistics): funnel, pie, radar, gauge, bar, line, scatter, heatmap

${MEMARID_RULES}

${ECHARTS_RULES}`

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

const HISTORY_ROUNDS = 3
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
      "Create or update a chart/diagram. Choose chartType based on diagram needs: 'mermaid' for flowcharts, sequence diagrams, class diagrams, etc.; 'echarts' for funnel charts, pie charts, radar charts, gauges, etc. Only use this when requirements are clear.",
    inputSchema: z.object({
      chartType: z
        .enum(["mermaid", "echarts"])
        .describe(
          "REQUIRED. Chart renderer type. Use 'mermaid' for process/flow diagrams (flowchart, sequence, class, state, ER, gantt, mindmap). Use 'echarts' for statistical charts (funnel, pie, radar, gauge, scatter, heatmap, treemap). When updating an existing chart, keep the same chartType unless user explicitly requests a different type."
        ),
      code: z
        .string()
        .describe(
          "For Mermaid: Raw diagram code WITHOUT markdown fences, starting with diagram type (e.g., 'flowchart TD'). For ECharts: Valid JSON configuration object for echarts.setOption()."
        ),
      description: z.string().describe("Brief description of what was created or changed"),
    }),
    execute: async ({
      chartType,
      code,
      description,
    }: {
      chartType: ChartType
      code: string
      description: string
    }) => {
      // Strip markdown code fences if the AI included them
      const cleanCode = stripCodeFences(code)
      return { success: true, chartType, code: cleanCode, description }
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

  const { userMessage, currentChart, currentChartType, thinking, webSearch, conversationId } =
    payload

  if (typeof currentChart !== "string" && currentChart !== undefined) {
    return new Response("Invalid request payload", { status: 400 })
  }

  const chartType = currentChartType === "echarts" ? "echarts" : "mermaid"

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

  // Append current chart context to user message instead of system prompt
  // This keeps system prompt stable for better caching and clearer separation
  if (typeof currentChart === "string") {
    const lastMessage = contextMessages[contextMessages.length - 1]
    if (lastMessage?.role === "user") {
      const chartContext = `\n\n[Current ${chartType} chart - maintain same chartType unless explicitly requested otherwise]\n\`\`\`${chartType === "echarts" ? "json" : "mermaid"}\n${currentChart}\n\`\`\``
      // Find text part and append context
      const textPart = lastMessage.parts.find((p): p is TextUIPart => p.type === "text")
      if (textPart) {
        textPart.text += chartContext
      } else {
        lastMessage.parts.push({ type: "text", text: chartContext })
      }
    }
  }

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
    system: SYSTEM_PROMPT,
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
        let latestChartType: ChartType | undefined
        if (toolResults) {
          const chartResult = toolResults.find((tr) => tr.toolName === "update_chart")
          if (chartResult && "output" in chartResult) {
            const output = chartResult.output as { code?: string; chartType?: ChartType }
            if (output?.code) {
              latestChartCode = output.code
              latestChartType = output.chartType ?? "mermaid"
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
              ...(latestChartType && { latestChartType }),
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
