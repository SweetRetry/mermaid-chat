"use client"

import { ConversationSelector } from "@/components/conversation/conversation-selector"
import { useChatStore } from "@/lib/store/chat-store"
import { type UIMessage, useChat } from "@ai-sdk/react"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@workspace/ui/ai-elements/conversation"
import { Message, MessageContent, MessageResponse } from "@workspace/ui/ai-elements/message"
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
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai"
import { Check, MessageSquare, Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

interface StoredMessage {
  id: string
  role: "user" | "assistant"
  content?: string
  parts?: UIMessage["parts"]
  createdAt: string
}

interface ChatPanelProps {
  className?: string
}

const MODELS = [
  { id: "deepseek-chat", name: "DeepSeek" },
  { id: "claude-sonnet", name: "Claude Sonnet" },
] as const

function normalizeMessageParts(message: StoredMessage): UIMessage["parts"] {
  if (Array.isArray(message.parts) && message.parts.length > 0) {
    return message.parts
  }

  if (typeof message.content === "string" && message.content.trim()) {
    return [{ type: "text" as const, text: message.content }]
  }

  return []
}

function convertToUIMessages(messages: StoredMessage[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: normalizeMessageParts(message),
  }))
}

export function ChatPanel({ className }: ChatPanelProps) {
  const [input, setInput] = useState("")
  const currentChart = useChatStore((state) => state.mermaidCode)
  const onChartUpdate = useChatStore((state) => state.setMermaidCode)
  const model = useChatStore((state) => state.model)
  const onModelChange = useChatStore((state) => state.setModel)
  const conversationId = useChatStore((state) => state.conversationId)
  const conversationDetail = useChatStore((state) => state.conversationDetail)
  const onConversationUpdate = useChatStore((state) => state.handleConversationUpdate)
  const onCreateConversation = useChatStore((state) => state.createConversation)
  const conversations = useChatStore((state) => state.conversations)
  const onDeleteConversation = useChatStore((state) => state.deleteConversation)
  const onSelectConversation = useChatStore((state) => state.loadConversation)
  const initialPrompt = useChatStore((state) => state.initialPrompt)
  const onPromptSent = useChatStore((state) => state.clearInitialPrompt)
  const loading = useChatStore((state) => state.loadingCount > 0)
  const initialMessages: StoredMessage[] = conversationDetail?.messages ?? []

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { currentChart, model, conversationId },
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
      const input = toolCall.input as { code?: string } | undefined
      if (typeof input?.code !== "string") return
      onChartUpdate(input.code)
    },
    onFinish: () => {
      onConversationUpdate()
    },
  })

  // Synchronize messages if they change (e.g. after initial hydration)
  useEffect(() => {
    if (initialUIMessages.length > 0 && messages.length === 0) {
      setMessages(initialUIMessages)
    }
  }, [initialUIMessages, setMessages, messages.length]) // Auto-send initial prompt if present
  useEffect(() => {
    if (initialPrompt && conversationId && status === "ready") {
      sendMessage({ text: initialPrompt })
      onPromptSent()
    }
  }, [initialPrompt, conversationId, sendMessage, onPromptSent, status])

  const getMessageContent = (message: UIMessage): string => {
    return message.parts
      .map((part) => {
        if (part.type === "text" && "text" in part) {
          return (part as { text: string }).text
        }
        return ""
      })
      .join("")
  }

  const getToolInvocations = (message: UIMessage) => {
    return message.parts.filter(isToolUIPart)
  }

  // Show recent conversations when no conversation is selected
  if (!conversationId) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex items-center justify-between px-4 h-12 border-b bg-muted/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight">Recent Chats</span>
          </div>
          <button
            type="button"
            onClick={() => onCreateConversation()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium shadow-sm"
          >
            <Plus className="size-3.5" />
            <span>New Chat</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {conversations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-50">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="size-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">No recent chats</p>
                <p className="text-[11px]">Start a new conversation to see it here.</p>
              </div>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectConversation(c.id)}
                className="w-full flex flex-col p-4 rounded-2xl border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {c.title || "Untitled Conversation"}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-4 h-12 border-b bg-muted/20 backdrop-blur-sm">
        <ConversationSelector
          conversations={conversations}
          currentId={conversationId}
          onSelect={onSelectConversation}
          onNew={onCreateConversation}
          onDelete={onDeleteConversation}
          loading={loading}
        />
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 animate-in fade-in duration-500 opacity-60">
              <div className="size-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-2 mx-auto">
                <MessageSquare className="size-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  Ready to visualize?
                </h3>
                <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                  Type your prompt below or pick an example from the diagram panel to get started.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const content = getMessageContent(message)
              const tools = getToolInvocations(message)

              return (
                <Message
                  key={message.id}
                  from={message.role}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <MessageContent
                    className={cn(
                      "px-4 py-3 rounded-2xl shadow-sm border",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground border-primary/20"
                        : "bg-muted/50 border-border"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <MessageResponse className="prose prose-sm dark:prose-invert">
                        {content}
                      </MessageResponse>
                    ) : (
                      <div className="whitespace-pre-wrap font-medium">{content}</div>
                    )}
                    {tools.map((tool) => {
                      if (!isToolUIPart(tool)) return null
                      const toolInvocation = tool
                      if (getToolName(toolInvocation) !== "update_chart") return null
                      if (toolInvocation.state !== "output-available") return null
                      const output = toolInvocation.output as { description?: string } | undefined
                      if (!output?.description) return null

                      return (
                        <div
                          key={toolInvocation.toolCallId}
                          className="mt-3 text-[11px] font-medium flex items-center gap-2 py-2 px-3 bg-background/50 rounded-lg border border-border/50"
                        >
                          <Check className="size-3 text-green-500" />
                          <span className="opacity-70">Updated diagram:</span>
                          <span className="font-semibold">{output.description}</span>
                        </div>
                      )
                    })}
                  </MessageContent>
                </Message>
              )
            })
          )}
        </ConversationContent>
        <ConversationScrollButton className="bottom-24" />
      </Conversation>

      <div className="p-4 bg-background/50 backdrop-blur-sm border-t">
        <PromptInput
          className="rounded-2xl border shadow-lg bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all"
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
