"use client"

import type { ConversationDetail } from "@/types/chat"
import { useEffect, useRef, useState } from "react"

/**
 * Hook for loading a specific conversation by ID.
 * Automatically loads/clears conversation when ID changes.
 */
export function useConversation(conversationId: string | undefined) {
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const latestRequestRef = useRef(0)

  useEffect(() => {
    if (!conversationId) {
      setConversationDetail(null)
      setIsLoading(false)
      return
    }

    const requestId = ++latestRequestRef.current
    setIsLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`)
        if (!res.ok) return
        const data: ConversationDetail = await res.json()
        if (latestRequestRef.current !== requestId) return
        setConversationDetail(data)
      } catch {
        // Ignore transient fetch errors; UI remains unchanged.
      } finally {
        if (latestRequestRef.current === requestId) {
          setIsLoading(false)
        }
      }
    })()
  }, [conversationId])

  return { conversationDetail, isLoading }
}
