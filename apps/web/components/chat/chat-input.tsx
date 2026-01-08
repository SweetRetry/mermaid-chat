"use client"

import { MODELS } from "@/lib/constants/models"
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

interface ChatInputProps {
  input: string
  onInputChange: (value: string) => void
  onSubmit: (text: string) => void
  status?: "ready" | "streaming" | "error"
  disabled?: boolean
  placeholder?: string
  className?: string

  model: string
  onModelChange: (value: string) => void
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
}: ChatInputProps) {
  const isDisabled = disabled ?? (status === "streaming" || !input.trim())

  return (
    <PromptInput
      onSubmit={({ text }) => {
        if (!text.trim()) return
        onSubmit(text)
      }}
    >
      <PromptInputBody>
        <PromptInputTextarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <Select value={model} onValueChange={onModelChange}>
          <SelectTrigger size="sm" className="w-[110px]">
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
        <PromptInputSubmit status={status} disabled={isDisabled} />
      </PromptInputFooter>
    </PromptInput>
  )
}
