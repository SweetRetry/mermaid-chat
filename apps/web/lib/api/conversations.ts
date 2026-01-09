import type { Conversation, ConversationDetail } from "@/types/chat"

export const conversationKeys = {
  all: ["conversations"] as const,
  lists: () => [...conversationKeys.all, "list"] as const,
  list: () => [...conversationKeys.lists()] as const,
  details: () => [...conversationKeys.all, "detail"] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch("/api/conversations")
  if (!res.ok) {
    throw new Error("Failed to fetch conversations")
  }
  const data = await res.json()
  return data.conversations ?? []
}

export async function fetchConversationDetail(id: string): Promise<ConversationDetail> {
  const res = await fetch(`/api/conversations/${id}`)
  if (!res.ok) {
    throw new Error("Failed to fetch conversation detail")
  }
  return res.json()
}

export async function createConversation(title?: string): Promise<Conversation> {
  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: title ? { "Content-Type": "application/json" } : undefined,
    body: title ? JSON.stringify({ title }) : undefined,
  })
  if (!res.ok) {
    throw new Error("Failed to create conversation")
  }
  return res.json()
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" })
  if (!res.ok) {
    throw new Error("Failed to delete conversation")
  }
}
