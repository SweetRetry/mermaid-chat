import type { UIMessage } from "@ai-sdk/react"
import type { StoredMessage } from "@/types/chat"

export function normalizeMessageParts(message: StoredMessage): UIMessage["parts"] {
  if (Array.isArray(message.parts) && message.parts.length > 0) {
    return message.parts
  }

  if (typeof message.content === "string" && message.content.trim()) {
    return [{ type: "text" as const, text: message.content }]
  }

  return []
}

export function convertToUIMessages(messages: StoredMessage[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: normalizeMessageParts(message),
  }))
}

export function getMessageContent(message: UIMessage): string {
  return message.parts
    .map((part) => {
      if (part.type === "text" && "text" in part) {
        return (part as { text: string }).text
      }
      return ""
    })
    .join("")
}
