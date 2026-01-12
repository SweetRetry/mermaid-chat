"use client"
import { useChatInitialization } from "@/hooks/use-chat-initialization"
import { useMermaidUpdates } from "@/hooks/use-mermaid-updates"
import { convertToUIMessages } from "@/lib/utils/message"
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
import { forwardRef, useImperativeHandle, useMemo, useState } from "react"
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
  // Local state for chat settings
  const [model, setModel] = useState("seed1.8")
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

  const { messages, sendMessage, status, setMessages } = useChat({
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

  // Handle message sync and pending message from home page
  const { pendingMessage } = useChatInitialization({
    conversationId,
    storedMessages: initialMessages,
    messages,
    status,
    sendMessage,
    setMessages,
  })

  // Handle mermaid diagram updates from messages
  useMermaidUpdates({
    messages,
    latestMermaidCode,
    setLatestMermaidCode,
    setIsMermaidUpdating,
  })

  if (isLoadingConversation && !pendingMessage) {
    return (
      <div className={cn("min-h-screen h-full flex flex-col overflow-hidden", className)}>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex justify-end">
            <Skeleton className="h-16 w-3/4 rounded-2xl" />
          </div>
          <div className="flex justify-start">
            <div className="space-y-3 w-full max-w-5/6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-32 w-full rounded-xl mt-4" />
            </div>
          </div>
        </div>
        <div className="p-4 bg-background shrink-0 z-10">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Conversation className="flex-1 overflow-y-auto relative">
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
        <ConversationScrollButton className="bottom-4" />
      </Conversation>
      <div className="p-4 bg-background shrink-0 z-10">
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
