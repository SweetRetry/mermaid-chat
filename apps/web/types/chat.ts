import type { UIMessage } from "@ai-sdk/react"
import type { ChartsData } from "./tool"

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
  charts: ChartsData | null
}

export interface Conversation {
  id: string
  title: string
  updatedAt: Date | string
  charts: ChartsData | null
}
