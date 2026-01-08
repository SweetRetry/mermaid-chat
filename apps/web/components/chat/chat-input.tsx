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

import { Button } from "@workspace/ui/components/button"
import { Plus } from "lucide-react"

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  status = "ready",
  disabled,
  placeholder = "Describe the diagram you want to create...",
  model,
  onModelChange,
  className,
}: ChatInputProps & { className?: string }) {
  const isDisabled = disabled ?? (status === "streaming" || !input.trim())

  return (
    <PromptInput
      className={className}
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
          className="min-h-[60px]"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Plus className="size-5" />
          </Button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <Select value={model} onValueChange={onModelChange}>
            <SelectTrigger
              size="sm"
              className="w-auto min-w-[100px] h-8 rounded-full border-none bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
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
            disabled={isDisabled}
            className="size-8 rounded-full shadow-lg"
          />
        </div>
      </PromptInputFooter>
    </PromptInput>
  )
}
