"use client"
import { useMermaidUpdates } from "@/hooks/use-mermaid-updates"
import { convertToUIMessages } from "@/lib/utils/message"
import { type PendingMessage, loadPendingMessage } from "@/lib/utils/pending-message"
import type { ConversationDetail, StoredMessage } from "@/types/chat"
import type { UpdateChartToolInput } from "@/types/tool"
import { useChat } from "@ai-sdk/react"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@workspace/ui/ai-elements/conversation"
import type { PromptInputMessage } from "@workspace/ui/ai-elements/prompt-input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { DefaultChatTransport, type FileUIPart } from "ai"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { ChatEmptyState } from "./chat-empty-state"
import { ChatInput } from "./chat-input"
import { ChatMessage } from "./chat-message"

interface ChatPanelProps {
  className?: string
  conversationId?: string
  conversationDetail: ConversationDetail | null
  isLoadingConversation: boolean
  onSelectMermaidMessage: (id: string | null) => void
  inputText: string
  onInputTextChange: (text: string) => void
  latestMermaidCode: string
  setLatestMermaidCode: (code: string) => void
  setIsMermaidUpdating: (updating: boolean) => void
}

export interface ChatPanelHandle {
  sendTextMessage: (text: string) => void
}

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(function ChatPanel(
  {
    className,
    conversationId,
    conversationDetail,
    isLoadingConversation,
    onSelectMermaidMessage,
    inputText,
    onInputTextChange,
    latestMermaidCode,
    setLatestMermaidCode,
    setIsMermaidUpdating,
  },
  ref
) {
  // Load pending message from sessionStorage once on mount
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(() =>
    loadPendingMessage()
  )

  // Initialize model from pendingMessage if available
  const [model, setModel] = useState(() => pendingMessage?.model ?? "seed1.8")
  const [thinking, setThinking] = useState(false)
  const [webSearch, setWebSearch] = useState(false)

  const initialMessages: StoredMessage[] = conversationDetail?.messages ?? []

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: (options) => {
          const lastMessage = options.messages[options.messages.length - 1]
          return {
            ...options,
            body: {
              currentChart: latestMermaidCode,
              model,
              thinking,
              webSearch,
              conversationId,
              userMessage: lastMessage?.role === "user" ? lastMessage.parts : null,
            },
          }
        },
      }),
    [conversationId, model, latestMermaidCode, thinking, webSearch]
  )

  const initialUIMessages = useMemo(() => convertToUIMessages(initialMessages), [initialMessages])

  const { messages, sendMessage, status } = useChat({
    id: conversationId ?? undefined,
    messages: initialUIMessages,
    transport,
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName !== "update_chart" || toolCall.dynamic) return
      const toolInput = toolCall.input as UpdateChartToolInput | undefined
      if (typeof toolInput?.code !== "string") return
      setLatestMermaidCode(toolInput.code)
    },
  })

  useImperativeHandle(
    ref,
    () => ({
      sendTextMessage: (text: string) => {
        if (!text.trim() || status !== "ready") return
        sendMessage({ parts: [{ type: "text", text }] })
      },
    }),
    [sendMessage, status]
  )

  // Send pending message once when ready
  useEffect(() => {
    if (!pendingMessage || !conversationId || status !== "ready") return

    const parts: Array<{ type: "text"; text: string } | FileUIPart> = []
    if (pendingMessage.files.length > 0) {
      parts.push(...pendingMessage.files)
    }
    if (pendingMessage.text.trim()) {
      parts.push({ type: "text", text: pendingMessage.text })
    }
    if (parts.length > 0) {
      sendMessage({ parts })
    }
    setPendingMessage(null)
  }, [pendingMessage, conversationId, status, sendMessage])

  // Handle mermaid diagram updates from messages via custom hook
  useMermaidUpdates({
    messages,
    latestMermaidCode,
    setLatestMermaidCode,
    setIsMermaidUpdating,
  })

  // Skip loading skeleton for new conversations with pending message
  if (isLoadingConversation && !pendingMessage) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 p-4 space-y-6">
          {/* User message skeleton */}
          <div className="flex justify-end">
            <Skeleton className="h-16 w-3/4 rounded-2xl" />
          </div>
          {/* Assistant message skeleton */}
          <div className="flex justify-start">
            <div className="space-y-3 w-full max-w-5/6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-32 w-full rounded-xl mt-4" />
            </div>
          </div>
        </div>
        {/* Input skeleton */}
        <div className="p-4">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto flex flex-col">
      <Conversation>
        <ConversationContent className="p-4 space-y-6">
          {messages.length === 0 ? (
            <ChatEmptyState />
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onSelectMermaidMessage={onSelectMermaidMessage}
              />
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton className="bottom-24" />
      </Conversation>
      <div className="p-4">
        <ChatInput
          input={inputText}
          onInputChange={onInputTextChange}
          onSubmit={(message: PromptInputMessage) => {
            if (!conversationId) return
            const parts: Array<{ type: "text"; text: string } | FileUIPart> = []
            if (message.files.length > 0) {
              parts.push(...message.files)
            }
            if (message.text.trim()) {
              parts.push({ type: "text", text: message.text })
            }
            if (parts.length === 0) return
            sendMessage({ parts })
            onInputTextChange("")
          }}
          disabled={!conversationId}
          status={status === "submitted" ? "streaming" : status}
          model={model}
          onModelChange={setModel}
          thinking={thinking}
          onThinkingChange={setThinking}
          webSearch={webSearch}
          onWebSearchChange={setWebSearch}
        />
      </div>
    </div>
  )
})
