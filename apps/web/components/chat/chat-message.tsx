"use client"

import { getMessageContent } from "@/lib/utils/message"
import type { UpdateChartToolUIPart } from "@/types/tool"
import type { UIMessage } from "@ai-sdk/react"
import { Message, MessageContent, MessageResponse } from "@workspace/ui/ai-elements/message"
import { cn } from "@workspace/ui/lib/utils"
import { ToolCallRenderer } from "./tool-call-renderer"

interface ChatMessageProps {
  message: UIMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
  const content = getMessageContent(message)

  const updateChartTool = (message.parts || []).find((part) => part.type === "tool-update_chart") as
    | UpdateChartToolUIPart
    | undefined

  return (
    <Message from={message.role} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <MessageContent
        className={cn(
          "px-4 py-3 rounded-2xl shadow-sm border",
          message.role === "user"
            ? "bg-primary text-primary-foreground border-primary/20"
            : "bg-muted/50 border-border"
        )}
      >
        {message.role === "assistant" ? (
          <MessageResponse className="prose prose-sm dark:prose-invert">{content}</MessageResponse>
        ) : (
          <div className="whitespace-pre-wrap font-medium">{content}</div>
        )}
        {updateChartTool && <ToolCallRenderer toolPart={updateChartTool} />}
      </MessageContent>
    </Message>
  )
}
