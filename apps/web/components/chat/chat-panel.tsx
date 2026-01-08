"use client"
import { MODELS } from "@/lib/constants/models"
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
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@workspace/ui/ai-elements/prompt-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"
import { DefaultChatTransport } from "ai"
import { useEffect, useMemo } from "react"
import { ChatEmptyState } from "./chat-empty-state"
import { ChatMessage } from "./chat-message"
import { ConversationListView } from "./conversation-list-view"

interface ChatPanelProps {
  className?: string
}

export function ChatPanel({ className }: ChatPanelProps) {
  const input = useChatStore((state) => state.inputText)
  const setInput = useChatStore((state) => state.setInputText)
  const currentChart = useChatStore((state) => state.mermaidCode)
  const onChartUpdate = useChatStore((state) => state.setMermaidCode)
  const model = useChatStore((state) => state.model)
  const onModelChange = useChatStore((state) => state.setModel)
  const conversationId = useChatStore((state) => state.conversationId)
  const conversationDetail = useChatStore((state) => state.conversationDetail)
  const onConversationUpdate = useChatStore((state) => state.handleConversationUpdate)
  const conversations = useChatStore((state) => state.conversations)
  const onSelectConversation = useChatStore((state) => state.loadConversation)
  const initialPrompt = useChatStore((state) => state.initialPrompt)
  const onPromptSent = useChatStore((state) => state.clearInitialPrompt)

  const handleSelectExample = useChatStore((state) => state.handleSelectExample)

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

        if (code && code !== currentChart) {
          onChartUpdate(code)
        }
        break
      }
    }
  }, [messages, currentChart, onChartUpdate])

  if (!conversationId) {
    return (
      <ConversationListView
        conversations={conversations}
        onSelect={onSelectConversation}
        onSelectExample={handleSelectExample}
        className={className}
      />
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Conversation className="flex-1">
        <ConversationContent className="p-4 space-y-6">
          {messages.length === 0 ? (
            <ChatEmptyState onSelectExample={handleSelectExample} />
          ) : (
            messages.map((message) => <ChatMessage key={message.id} message={message} />)
          )}
        </ConversationContent>
        <ConversationScrollButton className="bottom-24" />
      </Conversation>

      <div className="p-4 bg-transparent mt-auto">
        <PromptInput
          onSubmit={({ text }) => {
            if (!text.trim() || !conversationId) return
            sendMessage({ text })
            setInput("")
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the diagram you want to create..."
              className="min-h-[100px] resize-none border-none focus-visible:ring-0 px-4 py-3"
            />
          </PromptInputBody>
          <PromptInputFooter className="px-3 py-2 bg-muted/20 border-t flex items-center justify-between">
            <Select value={model} onValueChange={onModelChange}>
              <SelectTrigger className="h-8 w-[110px] bg-background/50 border-none shadow-none hover:bg-muted/50 transition-colors text-[10px] font-bold uppercase tracking-wider">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl">
                {MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="rounded-lg text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PromptInputSubmit
              status={status}
              disabled={status === "streaming" || !input.trim() || !conversationId}
              className="rounded-xl h-8 px-4 shadow-sm"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
