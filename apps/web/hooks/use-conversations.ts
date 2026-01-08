"use client"

import { useChatStore } from "@/lib/store/chat-store"
import { useEffect } from "react"

/**
 * Hook for fetching and accessing the conversations list.
 * Automatically fetches conversations on mount.
 */
export function useConversations() {
  const conversations = useChatStore((state) => state.conversations)
  const isLoading = useChatStore((state) => state.isLoadingConversations)

  useEffect(() => {
    useChatStore.getState().fetchConversations()
  }, [])

  return { conversations, isLoading }
}

/**
 * Hook for loading a specific conversation by ID.
 * Automatically loads/clears conversation when ID changes.
 */
export function useConversation(conversationId: string | undefined) {
  const conversationDetail = useChatStore((state) => state.conversationDetail)
  const isLoading = useChatStore((state) => state.isLoadingConversation)

  useEffect(() => {
    if (conversationId) {
      useChatStore.getState().loadConversation(conversationId)
    } else {
      useChatStore.getState().clearConversation()
    }
  }, [conversationId])

  return { conversationDetail, isLoading }
}
