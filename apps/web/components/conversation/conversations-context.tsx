"use client"

import type { Conversation } from "@/components/conversation/conversation-selector"
import {
  conversationKeys,
  createConversation as createConversationApi,
  deleteConversation as deleteConversationApi,
  fetchConversations,
} from "@/lib/api/conversations"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"

export interface PendingMessage {
  text: string
  files: Array<{ type: "file"; mediaType: string; url: string }>
  model: string
}

interface ConversationsContextValue {
  conversations: Conversation[]
  isLoading: boolean
  refreshConversations: () => Promise<void>
  createConversation: (title?: string) => Promise<string | null>
  deleteConversation: (id: string) => Promise<void>
  pendingMessage: PendingMessage | null
  setPendingMessage: (message: PendingMessage | null) => void
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null)

export function useConversationsContext() {
  const context = useContext(ConversationsContext)
  if (!context) {
    throw new Error("useConversationsContext must be used within ConversationsProvider")
  }
  return context
}

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null)

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: conversationKeys.list(),
    queryFn: fetchConversations,
  })

  const createMutation = useMutation({
    mutationFn: createConversationApi,
    onSuccess: (newConversation) => {
      queryClient.setQueryData<Conversation[]>(conversationKeys.list(), (old) =>
        old ? [newConversation, ...old] : [newConversation]
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteConversationApi,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Conversation[]>(conversationKeys.list(), (old) =>
        old ? old.filter((c) => c.id !== deletedId) : []
      )
      // Also invalidate the detail query for this conversation
      queryClient.removeQueries({ queryKey: conversationKeys.detail(deletedId) })
    },
  })

  const refreshConversations = async () => {
    await queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
  }

  const createConversation = async (title?: string): Promise<string | null> => {
    try {
      const result = await createMutation.mutateAsync(title)
      return result.id
    } catch {
      return null
    }
  }

  const deleteConversation = async (id: string): Promise<void> => {
    await deleteMutation.mutateAsync(id)
  }

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        isLoading,
        refreshConversations,
        createConversation,
        deleteConversation,
        pendingMessage,
        setPendingMessage,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  )
}
