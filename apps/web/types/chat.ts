import type { UIMessage } from "@ai-sdk/react"

export interface StoredMessage {
  id: string
  role: "user" | "assistant"
  content?: string
  parts?: UIMessage["parts"]
  createdAt: string
}

export interface ConversationDetail {
  id: string
  title: string
  messages: StoredMessage[]
  latestChart: { mermaidCode: string } | null
}

export interface Conversation {
  id: string
  title: string
  updatedAt: Date | string
  latestChartCode: string | null
}
