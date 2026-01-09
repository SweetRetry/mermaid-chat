"use client"

import { getMessageContent } from "@/lib/utils/message"
import type { UpdateChartToolUIPart } from "@/types/tool"
import type { UIMessage } from "@ai-sdk/react"
import { Message, MessageContent, MessageResponse } from "@workspace/ui/ai-elements/message"
import { ToolCallRenderer } from "./tool-call-renderer"

interface ChatMessageProps {
  message: UIMessage
  onSelectMermaidMessage: (id: string | null) => void
}

export function ChatMessage({ message, onSelectMermaidMessage }: ChatMessageProps) {
  const content = getMessageContent(message)

  const updateChartTool = (message.parts || []).find((part) => part.type === "tool-update_chart") as
    | UpdateChartToolUIPart
    | undefined

  return (
    <Message from={message.role}>
      <MessageContent>
        {message.role === "assistant" ? (
          <MessageResponse>{content}</MessageResponse>
        ) : (
          <div className="whitespace-pre-wrap">{content}</div>
        )}
        {updateChartTool && (
          <ToolCallRenderer
            toolPart={updateChartTool}
            messageId={message.id}
            onSelectMermaidMessage={onSelectMermaidMessage}
          />
        )}
      </MessageContent>
    </Message>
  )
}
