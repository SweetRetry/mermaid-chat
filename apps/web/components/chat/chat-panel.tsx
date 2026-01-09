"use client"
import { useConversationsContext } from "@/components/conversation/conversations-context"
import { useMermaidContext } from "@/components/mermaid/mermaid-context"
import { useMermaidUpdates } from "@/hooks/use-mermaid-updates"
import { convertToUIMessages, getMessageContent } from "@/lib/utils/message"
import type { ConversationDetail, StoredMessage } from "@/types/chat"
import type { UpdateChartToolInput } from "@/types/tool"
import { useChat } from "@ai-sdk/react"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@workspace/ui/ai-elements/conversation"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { DefaultChatTransport } from "ai"
import { MessageSquare } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { ChatEmptyState } from "./chat-empty-state"
import { ChatInput } from "./chat-input"
import { ChatMessage } from "./chat-message"

interface ChatPanelProps {
  className?: string
  conversationId?: string
  initialPrompt?: string
  conversationDetail: ConversationDetail | null
  isLoadingConversation: boolean
  onSelectMermaidMessage: (id: string | null) => void
  inputText: string
  onInputTextChange: (text: string) => void
}

export function ChatPanel({
  className,
  conversationId,
  initialPrompt,
  conversationDetail,
  isLoadingConversation,
  onSelectMermaidMessage,
  inputText,
  onInputTextChange,
}: ChatPanelProps) {
  const [model, setModel] = useState("deepseek-chat")

  const { latestMermaidCode, setLatestMermaidCode } = useMermaidContext()

  const { refreshConversations } = useConversationsContext()

  const initialMessages: StoredMessage[] = conversationDetail?.messages ?? []

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { currentChart: latestMermaidCode, model, conversationId },
        prepareSendMessagesRequest: (options) => {
          const lastMessage = options.messages[options.messages.length - 1]
          const query = lastMessage ? getMessageContent(lastMessage) : ""
          return {
            ...options,
            body: {
              ...options.body,
              query,
            },
          }
        },
      }),
    [latestMermaidCode, model, conversationId]
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
    onFinish: () => {
      refreshConversations()
    },
  })

  useEffect(() => {
    if (initialUIMessages.length > 0 && messages.length === 0) {
      setMessages(initialUIMessages)
    }
  }, [initialUIMessages, setMessages, messages.length])

  // Track if initial prompt has been sent - use ref to avoid re-render cycles
  const initialPromptSentRef = useRef(false)

  // Send initial prompt once when ready - minimal dependencies
  useEffect(() => {
    if (!initialPrompt || !conversationId || initialPromptSentRef.current) return
    if (status !== "ready") return

    initialPromptSentRef.current = true
    sendMessage({ text: initialPrompt })
  }, [initialPrompt, conversationId, status]) // Intentionally exclude sendMessage to prevent re-triggering

  // Handle mermaid diagram updates from messages via custom hook
  useMermaidUpdates(messages)

  if (!conversationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-50">
        <MessageSquare className="size-12 text-muted-foreground/40" />
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">No Conversation Selected</h3>
          <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
            Choose a chat from the sidebar or create a new one to get started.
          </p>
        </div>
      </div>
    )
  }

  // Skip loading skeleton for new conversations with initial prompt
  if (isLoadingConversation && !initialPrompt) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 p-4 space-y-6">
          {/* User message skeleton */}
          <div className="flex justify-end">
            <Skeleton className="h-16 w-3/4 rounded-2xl" />
          </div>
          {/* Assistant message skeleton */}
          <div className="flex justify-start">
            <div className="space-y-3 w-full max-w-[85%]">
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
    <div className="h-screen overflow-auto flex flex-col">
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
          onSubmit={(text) => {
            if (!conversationId) return
            sendMessage({ text })
            onInputTextChange("")
          }}
          disabled={!inputText.trim() || !conversationId}
          model={model}
          onModelChange={setModel}
        />
      </div>
    </div>
  )
}
