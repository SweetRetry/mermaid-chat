"use client"

import { type UIMessage, useChat } from "@ai-sdk/react"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
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
import { DefaultChatTransport, getToolName, isTextUIPart, isToolUIPart } from "ai"
import { Check, MessageSquare } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

interface StoredMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

interface ChatPanelProps {
  currentChart: string
  onChartUpdate: (code: string) => void
  model: string
  models: ReadonlyArray<{ id: string; name: string }>
  onModelChange: (value: string) => void
  conversationId: string | null
  initialMessages: StoredMessage[]
  onConversationUpdate: () => void
  className?: string
}

function convertToUIMessages(messages: StoredMessage[]): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
  }))
}

export function ChatPanel({
  currentChart,
  onChartUpdate,
  model,
  models,
  onModelChange,
  conversationId,
  initialMessages,
  onConversationUpdate,
  className,
}: ChatPanelProps) {
  const [input, setInput] = useState("")

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

  // Reset messages when initialMessages change (conversation switch)
  useEffect(() => {
    setMessages(initialUIMessages)
  }, [initialUIMessages, setMessages])

  const getMessageContent = (message: UIMessage): string => {
    return message.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join("")
  }

  const getToolInvocations = (message: UIMessage) => {
    return message.parts.filter(isToolUIPart)
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-4 h-12 border-b bg-muted/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">Chat</span>
        </div>
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="p-4 space-y-6">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="How can I help you today?"
              description='Describe the diagram you want to build. Try: "Create a flowchart for an OAuth2 login process"'
              icon={
                <div className="size-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="size-8 text-primary" />
                </div>
              }
            />
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
                      if (getToolName(tool) !== "update_chart") return null
                      if (tool.state !== "output-available") return null
                      const output = tool.output as { description?: string } | undefined
                      if (!output?.description) return null

                      return (
                        <div
                          key={tool.toolCallId}
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
          <PromptInputFooter className="px-4 py-3 bg-muted/20 border-t flex items-center justify-between">
            <Select value={model} onValueChange={onModelChange}>
              <SelectTrigger className="h-9 w-[150px] bg-background border-none shadow-sm hover:bg-muted/50 transition-colors">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl">
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="rounded-lg">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PromptInputSubmit
              status={status}
              disabled={status === "streaming" || !input.trim() || !conversationId}
              className="rounded-xl h-9 px-4 shadow-sm"
            />
          </PromptInputFooter>
        </PromptInput>
        <p className="text-[10px] text-center text-muted-foreground mt-3 uppercase tracking-widest font-semibold opacity-50">
          Powered by Mermaid.js & AI
        </p>
      </div>
    </div>
  )
}
