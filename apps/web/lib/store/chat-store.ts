"use client"

import type { UIMessage } from "@ai-sdk/react"
import type { Conversation } from "@/components/conversation/conversation-selector"
import { create } from "zustand"

interface ConversationDetail {
  id: string
  title: string
  messages: Array<{
    id: string
    role: "user" | "assistant"
    content?: string
    parts?: UIMessage["parts"]
    createdAt: string
  }>
  latestChart: { mermaidCode: string } | null
}

interface ChatStore {
  mermaidCode: string
  model: string
  conversations: Conversation[]
  conversationId: string | null
  conversationDetail: ConversationDetail | null
  loadingCount: number
  initialPrompt: string | null
  inputText: string
  fetchConversations: () => Promise<void>
  loadConversation: (id: string) => Promise<void>
  createConversation: () => Promise<string | null>
  deleteConversation: (id: string) => Promise<void>
  handleConversationUpdate: () => Promise<void>
  handleSelectExample: (prompt: string) => Promise<void>
  clearInitialPrompt: () => void
  setMermaidCode: (code: string) => void
  setModel: (model: string) => void
  setInputText: (text: string) => void
  appendInputText: (text: string) => void
}

export const useChatStore = create<ChatStore>((set, get) => {
  let latestConversationRequest = 0

  const withLoading = async (task: () => Promise<void>) => {
    set((state) => ({ loadingCount: state.loadingCount + 1 }))
    try {
      await task()
    } finally {
      set((state) => ({ loadingCount: Math.max(0, state.loadingCount - 1) }))
    }
  }

  return {
    mermaidCode: "",
    model: "deepseek-chat",
    conversations: [],
    conversationId: null,
    conversationDetail: null,
    loadingCount: 0,
    initialPrompt: null,
    inputText: "",
    fetchConversations: async () => {
      await withLoading(async () => {
        try {
          const res = await fetch("/api/conversations")
          if (res.ok) {
            const data = await res.json()
            set({ conversations: data.conversations ?? [] })
          }
        } catch {
          // Ignore transient fetch errors; UI remains unchanged.
        }
      })
    },
    loadConversation: async (id: string) => {
      const requestId = latestConversationRequest + 1
      latestConversationRequest = requestId
      await withLoading(async () => {
        try {
          const res = await fetch(`/api/conversations/${id}`)
          if (res.ok) {
            const data: ConversationDetail = await res.json()
            if (latestConversationRequest !== requestId) return
            set({
              conversationId: id,
              conversationDetail: data,
              mermaidCode: data.latestChart?.mermaidCode ?? "",
            })
          }
        } catch {
          // Ignore transient fetch errors; UI remains unchanged.
        }
      })
    },
    createConversation: async () => {
      let createdId: string | null = null
      await withLoading(async () => {
        try {
          const res = await fetch("/api/conversations", { method: "POST" })
          if (res.ok) {
            const data = await res.json()
            createdId = data.id
            set((state) => ({
              conversations: [data, ...state.conversations],
              conversationId: data.id,
              conversationDetail: {
                id: data.id,
                title: data.title,
                messages: [],
                latestChart: null,
              },
              mermaidCode: "",
            }))
          }
        } catch {
          // Ignore transient create errors; UI remains unchanged.
        }
      })
      return createdId
    },
    deleteConversation: async (id: string) => {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" })
      if (!res.ok) return

      set((state) => {
        const isCurrent = state.conversationId === id
        return {
          conversations: state.conversations.filter((c) => c.id !== id),
          conversationId: isCurrent ? null : state.conversationId,
          conversationDetail: isCurrent ? null : state.conversationDetail,
          mermaidCode: isCurrent ? "" : state.mermaidCode,
        }
      })
    },
    handleConversationUpdate: async () => {
      await get().fetchConversations()
    },
    handleSelectExample: async (prompt: string) => {
      let { conversationId } = get()
      if (!conversationId) {
        conversationId = await get().createConversation()
      }
      if (conversationId) {
        set({ initialPrompt: prompt })
      }
    },
    clearInitialPrompt: () => {
      set({ initialPrompt: null })
    },
    setMermaidCode: (code: string) => {
      set({ mermaidCode: code })
    },
    setModel: (model: string) => {
      set({ model })
    },
    setInputText: (text: string) => {
      set({ inputText: text })
    },
    appendInputText: (text: string) => {
      const next = text.trim()
      if (!next) return
      set((state) => {
        const separator = state.inputText && !state.inputText.endsWith(" ") ? " " : ""
        return { inputText: `${state.inputText}${separator}${next}` }
      })
    },
  }
})
