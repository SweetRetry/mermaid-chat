"use client"

import { MODELS } from "@/lib/constants/models"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
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
  model: string
  onModelChange: (value: string) => void
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
      className={cn(active && "bg-primary/10 text-primary")}
    >
      <Brain className="size-4" />
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
      className={cn(active && "bg-primary/10 text-primary")}
    >
      <Globe className="size-4" />
    </PromptInputButton>
  )
}

async function processMarkdownFiles(message: PromptInputMessage): Promise<PromptInputMessage> {
  const textParts: string[] = [message.text]
  const mediaFiles: FileUIPart[] = []

  for (const file of message.files) {
    if (file.mediaType === "text/markdown" || file.filename?.endsWith(".md")) {
      // Read markdown file as text
      if (file.url) {
        try {
          const response = await fetch(file.url)
          const content = await response.text()
          textParts.push(`--- ${file.filename ?? "markdown"} ---\n${content}`)
        } catch {
          // If fetch fails, keep as file
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
  model,
  onModelChange,
  thinking = false,
  onThinkingChange,
  webSearch = false,
  onWebSearchChange,
  className,
}: ChatInputProps) {
  const supportsFiles = model === "seed1.8"

  const handleThinkingToggle = () => {
    onThinkingChange?.(!thinking)
  }

  const handleWebSearchToggle = () => {
    onWebSearchChange?.(!webSearch)
  }

  const handleSubmit = async (message: PromptInputMessage) => {
    // Process markdown files: convert to text
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
        <AttachmentButton disabled={!supportsFiles} />
        <ThinkingButton active={thinking} onToggle={handleThinkingToggle} />
        <WebSearchButton active={webSearch} onToggle={handleWebSearchToggle} />

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <Select value={model} onValueChange={onModelChange}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <PromptInputSubmit
            status={status}
            disabled={disabled ?? status === "streaming"}
            className="rounded-full shadow-md"
          />
        </div>
      </PromptInputFooter>
    </PromptInput>
  )
}
