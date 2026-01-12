"use client"

import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputAttachments,
} from "@workspace/ui/ai-elements/prompt-input"
import { cn } from "@workspace/ui/lib/utils"
import type { FileUIPart } from "ai"
import { Brain, Globe, Paperclip } from "lucide-react"

const ACCEPT_STRING = "image/*,video/*,text/markdown,.md"

interface ChatInputProps {
  input: string
  onInputChange: (value: string) => void
  onSubmit: (message: PromptInputMessage) => void
  status?: "ready" | "streaming" | "error"
  disabled?: boolean
  placeholder?: string
  className?: string
  thinking?: boolean
  onThinkingChange?: (value: boolean) => void
  webSearch?: boolean
  onWebSearchChange?: (value: boolean) => void
}

function AttachmentButton({ disabled }: { disabled: boolean }) {
  const attachments = usePromptInputAttachments()

  return (
    <PromptInputButton
      disabled={disabled}
      onClick={() => attachments.openFileDialog()}
      title={disabled ? "当前模型不支持文件上传" : "添加文件 (图片、视频、Markdown)"}
    >
      <Paperclip className="size-4" />
    </PromptInputButton>
  )
}

function ThinkingButton({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: () => void
}) {
  return (
    <PromptInputButton
      onClick={onToggle}
      title={active ? "关闭深度思考" : "开启深度思考"}
      className={cn("transition-all", active && "bg-primary/10 text-primary")}
    >
      <Brain className="size-4" />
      {active && <span className="text-xs font-medium">深度思考</span>}
    </PromptInputButton>
  )
}

function WebSearchButton({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: () => void
}) {
  return (
    <PromptInputButton
      onClick={onToggle}
      title={active ? "关闭联网搜索" : "开启联网搜索"}
      className={cn("transition-all", active && "bg-primary/10 text-primary")}
    >
      <Globe className="size-4" />
      {active && <span className="text-xs font-medium">联网搜索</span>}
    </PromptInputButton>
  )
}

async function processMarkdownFiles(message: PromptInputMessage): Promise<PromptInputMessage> {
  const textParts: string[] = [message.text]
  const mediaFiles: FileUIPart[] = []

  for (const file of message.files) {
    if (file.mediaType === "text/markdown" || file.filename?.endsWith(".md")) {
      if (file.url) {
        try {
          const response = await fetch(file.url)
          const content = await response.text()
          textParts.push(`--- ${file.filename ?? "markdown"} ---\n${content}`)
        } catch {
          mediaFiles.push(file)
        }
      }
    } else {
      mediaFiles.push(file)
    }
  }

  return {
    text: textParts.filter(Boolean).join("\n\n"),
    files: mediaFiles,
  }
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  status = "ready",
  disabled,
  placeholder = "Describe the diagram you want to create...",
  className,
  thinking = false,
  onThinkingChange,
  webSearch = false,
  onWebSearchChange,
}: ChatInputProps) {

  const handleSubmit = async (message: PromptInputMessage) => {
    const processed = await processMarkdownFiles(message)
    onSubmit(processed)
  }

  return (
    <PromptInput className={className} accept={ACCEPT_STRING} multiple onSubmit={handleSubmit}>
      <PromptInputBody>
        <PromptInputAttachments>
          {(file) => <PromptInputAttachment data={file} />}
        </PromptInputAttachments>
        <PromptInputTextarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-16"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <AttachmentButton disabled={false} />
        <ThinkingButton active={thinking} onToggle={() => onThinkingChange?.(!thinking)} />
        <WebSearchButton active={webSearch} onToggle={() => onWebSearchChange?.(!webSearch)} />

        <div className="flex-1" />

        <PromptInputSubmit
          status={status}
          disabled={disabled ?? status === "streaming"}
          className="rounded-full shadow-md"
        />
      </PromptInputFooter>
    </PromptInput>
  )
}
