"use client"

import type { UIMessage } from "@ai-sdk/react"
import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
} from "@workspace/ui/ai-elements/message"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@workspace/ui/ai-elements/reasoning"
import type { FileUIPart, ReasoningUIPart } from "ai"
import { getMessageContent } from "@/lib/utils/message"
import type { UpdateChartToolUIPart } from "@/types/tool"
import { ToolCallRenderer } from "./tool-call-renderer"

interface ChatMessageProps {
  message: UIMessage
  onSelectChartMessage: (id: string | null) => void
}

export function ChatMessage({ message, onSelectChartMessage }: ChatMessageProps) {
  const content = getMessageContent(message)

  const updateChartTool = (message.parts || []).find((part) => part.type === "tool-update_chart") as
    | UpdateChartToolUIPart
    | undefined

  const fileParts = (message.parts || []).filter((part) => part.type === "file") as FileUIPart[]

  const reasoningParts = (message.parts || []).filter(
    (part) => part.type === "reasoning"
  ) as ReasoningUIPart[]

  const reasoningText = reasoningParts.map((p) => p.text).join("\n")

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
        {reasoningText && (
          <Reasoning>
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        )}
        {message.role === "assistant" ? (
          <MessageResponse>{content}</MessageResponse>
        ) : (
          content && <div className="whitespace-pre-wrap">{content}</div>
        )}
        {updateChartTool && (
          <ToolCallRenderer
            toolPart={updateChartTool}
            messageId={message.id}
            onSelectChartMessage={onSelectChartMessage}
          />
        )}
      </MessageContent>
    </Message>
  )
}
