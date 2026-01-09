"use client"

import { getMessageContent } from "@/lib/utils/message"
import type { UpdateChartToolUIPart } from "@/types/tool"
import type { UIMessage } from "@ai-sdk/react"
import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
} from "@workspace/ui/ai-elements/message"
import type { FileUIPart } from "ai"
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

  const fileParts = (message.parts || []).filter((part) => part.type === "file") as FileUIPart[]

  return (
    <Message from={message.role}>
      {fileParts.length > 0 && (
        <MessageAttachments>
          {fileParts.map((file, index) => (
            <MessageAttachment key={index} data={file} />
          ))}
        </MessageAttachments>
      )}
      <MessageContent>
        {message.role === "assistant" ? (
          <MessageResponse>{content}</MessageResponse>
        ) : (
          content && <div className="whitespace-pre-wrap">{content}</div>
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
