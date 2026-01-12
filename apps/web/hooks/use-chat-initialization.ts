"use client"

import { convertToUIMessages } from "@/lib/utils/message"
import { clearPendingMessage, loadPendingMessage } from "@/lib/utils/pending-message"
import type { StoredMessage } from "@/types/chat"
import type { UIMessage } from "@ai-sdk/react"
import type { ChatRequestOptions, FileUIPart, TextPart } from "ai"
import { useEffect, useRef, useState } from "react"

type SendMessageParam = {
  parts: (TextPart | FileUIPart)[]
}

interface UseChatInitializationProps {
  conversationId?: string
  storedMessages?: StoredMessage[]
  messages: UIMessage[]
  status: "streaming" | "submitted" | "ready" | "error"
  sendMessage: (message?: SendMessageParam, options?: ChatRequestOptions) => Promise<void>
  setMessages: (messages: UIMessage[]) => void
}

/**
 * Handles:
 * 1. Syncing stored messages to useChat when conversation loads
 * 2. Sending pending message from home page after navigation
 */
export function useChatInitialization({
  conversationId,
  storedMessages,
  messages,
  status,
  sendMessage,
  setMessages,
}: UseChatInitializationProps) {
  const [pendingMessage, setPendingMessage] = useState(() => loadPendingMessage())
  const hasSentRef = useRef(false)

  // Sync stored messages to useChat when conversation data loads
  useEffect(() => {
    if (!storedMessages?.length || messages.length > 0 || pendingMessage) {
      return
    }
    const uiMessages = convertToUIMessages(storedMessages)
    if (uiMessages.length > 0) {
      setMessages(uiMessages)
    }
  }, [storedMessages, messages.length, pendingMessage, setMessages])

  // Send pending message once ready
  useEffect(() => {
    if (!pendingMessage || !conversationId || status !== "ready" || hasSentRef.current) {
      return
    }

    hasSentRef.current = true

    const parts: (TextPart | FileUIPart)[] = []
    if (pendingMessage.files?.length > 0) {
      parts.push(...pendingMessage.files)
    }
    if (pendingMessage.text?.trim()) {
      parts.push({ type: "text", text: pendingMessage.text })
    }

    if (parts.length > 0) {
      sendMessage({ parts })
    }

    clearPendingMessage()
    setPendingMessage(null)
  }, [pendingMessage, conversationId, status, sendMessage])

  return { pendingMessage }
}
