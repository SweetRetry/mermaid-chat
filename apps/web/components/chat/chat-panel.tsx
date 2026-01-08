"use client"
import { useChatStore } from "@/lib/store/chat-store"
import { convertToUIMessages, getMessageContent } from "@/lib/utils/message"
import type { StoredMessage } from "@/types/chat"
import type { UpdateChartToolInput, UpdateChartToolUIPart } from "@/types/tool"
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
import { useShallow } from "zustand/react/shallow"
import { ChatEmptyState } from "./chat-empty-state"
import { ChatInput } from "./chat-input"
import { ChatMessage } from "./chat-message"

interface ChatPanelProps {
  className?: string
  conversationId?: string
}

export function ChatPanel({ className, conversationId }: ChatPanelProps) {
  const [model, setModel] = useState("deepseek-chat")

  // Batch select state values with shallow comparison to reduce re-renders
  const { input, currentChart, conversationDetail, isLoadingConversation, initialPrompt } =
    useChatStore(
      useShallow((state) => ({
        input: state.inputText,
        currentChart: state.mermaidCode,
        conversationDetail: state.conversationDetail,
        isLoadingConversation: state.isLoadingConversation,
        initialPrompt: state.initialPrompt,
      }))
    )

  // Select actions separately (they don't change, so no shallow needed)
  const setInput = useChatStore((state) => state.setInputText)
  const onChartUpdate = useChatStore((state) => state.setMermaidCode)
  const onConversationUpdate = useChatStore((state) => state.fetchConversations)
  const onPromptSent = useChatStore((state) => state.clearInitialPrompt)

  const initialMessages: StoredMessage[] = conversationDetail?.messages ?? []

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { currentChart, model, conversationId },
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
    [currentChart, model, conversationId]
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
      onChartUpdate(toolInput.code)
    },
    onFinish: () => {
      onConversationUpdate()
    },
  })

  useEffect(() => {
    if (initialUIMessages.length > 0 && messages.length === 0) {
      setMessages(initialUIMessages)
    }
  }, [initialUIMessages, setMessages, messages.length])

  useEffect(() => {
    if (initialPrompt && conversationId && status === "ready") {
      sendMessage({ text: initialPrompt })
      onPromptSent()
    }
  }, [initialPrompt, conversationId, sendMessage, onPromptSent, status])

  // Use ref to track current chart without causing re-renders
  const currentChartRef = useRef(currentChart)
  currentChartRef.current = currentChart

  useEffect(() => {
    if (messages.length === 0) return

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (!msg || msg.role !== "assistant") continue

      const parts = msg.parts || []
      const updatePart = parts.find((p) => p.type === "tool-update_chart") as
        | UpdateChartToolUIPart
        | undefined

      if (updatePart) {
        const code =
          updatePart.state === "output-available" ? updatePart.output?.code : updatePart.input?.code

        if (code && code !== currentChartRef.current) {
          onChartUpdate(code)
        }
        break
      }
    }
  }, [messages, onChartUpdate])

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

  if (isLoadingConversation) {
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
    <div className={cn("flex flex-col h-full", className)}>
      <Conversation className="flex-1">
        <ConversationContent className="p-4 space-y-6">
          {messages.length === 0 ? (
            <ChatEmptyState />
          ) : (
            messages.map((message) => <ChatMessage key={message.id} message={message} />)
          )}
        </ConversationContent>
        <ConversationScrollButton className="bottom-24" />
      </Conversation>
      <div className="p-4">
        <ChatInput
          input={input}
          onInputChange={setInput}
          onSubmit={(text) => {
            if (!conversationId) return
            sendMessage({ text })
            setInput("")
          }}
          disabled={!input.trim() || !conversationId}
          model={model}
          onModelChange={setModel}
        />
      </div>
    </div>
  )
}
