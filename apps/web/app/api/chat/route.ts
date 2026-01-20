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
import { conversations, db, type Message, messages, type ChartsData } from "@/lib/db"
import type { ChartTarget, ChartType } from "@/types/tool"

export const maxDuration = 60

const BASE_SYSTEM_PROMPT = `You are a friendly diagram/chart assistant. You create visualizations using Mermaid.js or ECharts.

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

function getChartTargetPrompt(chartTarget: ChartTarget): string {
  switch (chartTarget) {
    case "mermaid":
      return "\n\n## Chart Target Constraint\nThe user has explicitly selected Mermaid as the renderer. You MUST only call update_mermaid_chart. Do NOT use ECharts for this request."
    case "echarts":
      return "\n\n## Chart Target Constraint\nThe user has explicitly selected ECharts as the renderer. You MUST only call update_echarts_chart. Do NOT use Mermaid for this request."
    case "both":
      return "\n\n## Chart Target Constraint\nThe user wants BOTH charts to be updated. You MUST call both update_mermaid_chart AND update_echarts_chart in your response."
    case "auto":
    default:
      return "\n\n## Chart Target Selection\nAutomatically decide which chart(s) to update based on the user's request. You can call one or both tools as appropriate. For complex scenarios (e.g., 'conversion funnel + event tracking flow'), consider using both tools."
  }
}

function getChartContextPrompt(charts: ChartsData | undefined): string {
  if (!charts || (!charts.mermaid && !charts.echarts)) {
    return ""
  }

  const parts: string[] = ["\n\n## Current Charts"]

  if (charts.mermaid?.code) {
    parts.push(`\n### Mermaid Chart\n\`\`\`mermaid\n${charts.mermaid.code}\n\`\`\``)
  }

  if (charts.echarts?.code) {
    parts.push(`\n### ECharts Chart\n\`\`\`json\n${charts.echarts.code}\n\`\`\``)
  }

  parts.push("\nWhen the user asks to modify an existing chart, use the code above as the base and apply the requested changes.")

  return parts.join("")
}

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

const MERMAID_TOOL = {
  update_mermaid_chart: tool({
    description:
      "Create or update a Mermaid diagram (flowchart, sequence, class, state, ER, Gantt, mindmap, etc.). Use for process flows, structural diagrams, and relationship visualizations.",
    inputSchema: z.object({
      code: z
        .string()
        .describe(
          "Raw Mermaid diagram code WITHOUT markdown fences, starting with diagram type (e.g., 'flowchart TD', 'sequenceDiagram', 'classDiagram')."
        ),
      description: z.string().describe("Brief description of what was created or changed"),
    }),
    execute: async ({ code, description }: { code: string; description: string }) => {
      const cleanCode = stripCodeFences(code)
      return { success: true, chartType: "mermaid" as const, code: cleanCode, description }
    },
  }),
}

const ECHARTS_TOOL = {
  update_echarts_chart: tool({
    description:
      "Create or update an ECharts chart (funnel, pie, bar, line, radar, gauge, scatter, heatmap, treemap, etc.). Use for statistical data, metrics, and numerical visualizations.",
    inputSchema: z.object({
      code: z
        .string()
        .describe("Valid JSON configuration object for echarts.setOption(). Must be valid JSON."),
      description: z.string().describe("Brief description of what was created or changed"),
    }),
    execute: async ({ code, description }: { code: string; description: string }) => {
      const cleanCode = stripCodeFences(code)
      return { success: true, chartType: "echarts" as const, code: cleanCode, description }
    },
  }),
}

function getTools(chartTarget: ChartTarget) {
  switch (chartTarget) {
    case "mermaid":
      return MERMAID_TOOL
    case "echarts":
      return ECHARTS_TOOL
    case "both":
    case "auto":
    default:
      return { ...MERMAID_TOOL, ...ECHARTS_TOOL }
  }
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

  const { userMessage, charts, chartTarget, thinking, webSearch, conversationId } = payload

  // Validate charts is an object or undefined
  if (charts !== undefined && (typeof charts !== "object" || charts === null)) {
    return new Response("Invalid request payload: charts must be an object", { status: 400 })
  }

  const currentCharts = charts as ChartsData | undefined
  const validChartTarget = (
    ["auto", "mermaid", "echarts", "both"].includes(chartTarget as string) ? chartTarget : "auto"
  ) as ChartTarget

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

  const modelMessages = convertToModelMessages(contextMessages)

  const chartTools = getTools(validChartTarget)
  const tools =
    webSearch === true
      ? {
          ...chartTools,
          web_search: volcengine.tools.webSearch({
            maxKeyword: 3,
            limit: 10,
          }),
        }
      : chartTools

  const systemPrompt =
    BASE_SYSTEM_PROMPT + getChartTargetPrompt(validChartTarget) + getChartContextPrompt(currentCharts)

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

        // Collect chart updates from tool results
        let chartsUpdate: ChartsData | undefined
        if (toolResults) {
          const now = new Date().toISOString()
          for (const tr of toolResults) {
            if ("output" in tr) {
              const output = tr.output as { code?: string; chartType?: ChartType }
              if (output?.code && output?.chartType) {
                chartsUpdate = chartsUpdate ?? {}
                chartsUpdate[output.chartType] = { code: output.code, updatedAt: now }
              }
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

          // Merge new chart updates with existing charts
          let finalCharts: ChartsData | undefined
          if (chartsUpdate) {
            const existing = await tx
              .select({ charts: conversations.charts })
              .from(conversations)
              .where(eq(conversations.id, conversationId))
              .limit(1)
            const existingCharts = (existing[0]?.charts as ChartsData) ?? {}
            finalCharts = { ...existingCharts, ...chartsUpdate }
          }

          await tx
            .update(conversations)
            .set({
              updatedAt: new Date(),
              ...(finalCharts && { charts: finalCharts }),
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
