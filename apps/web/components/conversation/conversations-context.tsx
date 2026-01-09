"use client"

import type { Conversation } from "@/components/conversation/conversation-selector"
import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"

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
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null)
  const latestRequestRef = useRef(0)

  const refreshConversations = useCallback(async () => {
    const requestId = ++latestRequestRef.current
    setIsLoading(true)
    try {
      const res = await fetch("/api/conversations")
      if (!res.ok) return
      const data = await res.json()
      if (latestRequestRef.current !== requestId) return
      setConversations(data.conversations ?? [])
    } catch {
      // Ignore transient fetch errors; UI remains unchanged.
    } finally {
      if (latestRequestRef.current === requestId) {
        setIsLoading(false)
      }
    }
  }, [])

  const createConversation = useCallback(async (title?: string) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        body: title ? JSON.stringify({ title }) : undefined,
      })
      if (!res.ok) return null
      const data: Conversation = await res.json()
      setConversations((prev) => [data, ...prev])
      return data.id
    } catch {
      // Ignore transient create errors; UI remains unchanged.
    }
    return null
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" })
    if (!res.ok) return
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }, [])

  useEffect(() => {
    refreshConversations()
  }, [refreshConversations])

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
