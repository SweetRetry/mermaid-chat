"use client"

import type { Conversation } from "@/components/conversation/conversation-selector"
import type { UIMessage } from "@ai-sdk/react"
import { create } from "zustand"

export interface ConversationDetail {
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
  conversations: Conversation[]
  conversationDetail: ConversationDetail | null
  isLoadingConversations: boolean
  isLoadingConversation: boolean
  inputText: string
  fetchConversations: () => Promise<void>
  loadConversation: (id: string) => Promise<void>
  createConversation: () => Promise<string | null>
  deleteConversation: (id: string) => Promise<void>
  setMermaidCode: (code: string) => void
  clearConversation: () => void
  setInputText: (text: string) => void
  appendInputText: (text: string) => void
}

export const useChatStore = create<ChatStore>((set) => {
  let latestConversationRequest = 0

  return {
    mermaidCode: "",
    conversations: [],
    conversationDetail: null,
    isLoadingConversations: true,
    isLoadingConversation: false,
    inputText: "",
    fetchConversations: async () => {
      set({ isLoadingConversations: true })
      try {
        const res = await fetch("/api/conversations")
        if (res.ok) {
          const data = await res.json()
          set({ conversations: data.conversations ?? [] })
        }
      } catch {
        // Ignore transient fetch errors; UI remains unchanged.
      } finally {
        set({ isLoadingConversations: false })
      }
    },
    loadConversation: async (id: string) => {
      const requestId = ++latestConversationRequest
      set({ isLoadingConversation: true })
      try {
        const res = await fetch(`/api/conversations/${id}`)
        if (res.ok) {
          const data: ConversationDetail = await res.json()
          if (latestConversationRequest !== requestId) return
          set({
            conversationDetail: data,
            mermaidCode: data.latestChart?.mermaidCode ?? "",
          })
        }
      } catch {
        // Ignore transient fetch errors; UI remains unchanged.
      } finally {
        if (latestConversationRequest === requestId) {
          set({ isLoadingConversation: false })
        }
      }
    },
    createConversation: async () => {
      try {
        const res = await fetch("/api/conversations", { method: "POST" })
        if (res.ok) {
          const data = await res.json()
          set((state) => ({
            conversations: [data, ...state.conversations],
          }))
          return data.id
        }
      } catch {
        // Ignore transient create errors; UI remains unchanged.
      }
      return null
    },
    deleteConversation: async (id: string) => {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" })
      if (!res.ok) return

      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
      }))
    },
    setMermaidCode: (code: string) => {
      set({ mermaidCode: code })
    },
    clearConversation: () => {
      set({
        conversationDetail: null,
        mermaidCode: "",
      })
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
