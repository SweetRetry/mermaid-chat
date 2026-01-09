"use client"

import { MODELS } from "@/lib/constants/models"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@workspace/ui/ai-elements/prompt-input"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { FileIcon, Film, ImageIcon, Music, X } from "lucide-react"
import { useRef, useState } from "react"

// Gemini supported file types
const SUPPORTED_MIME_TYPES = [
  // Images
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  // Videos
  "video/mp4",
  "video/mpeg",
  "video/mov",
  "video/avi",
  "video/x-flv",
  "video/mpg",
  "video/webm",
  "video/wmv",
  "video/3gpp",
  // Audio
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/aiff",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  // Documents
  "application/pdf",
  // Text files
  "text/plain",
  "text/markdown",
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
  "application/xml",
]

const ACCEPT_STRING = SUPPORTED_MIME_TYPES.join(",")

interface FilePreview {
  file: File
  url: string
  type: "image" | "video" | "audio" | "text" | "document"
}

function getFileType(mimeType: string): FilePreview["type"] {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "application/xml")
    return "text"
  return "document"
}

interface ChatInputProps {
  input: string
  onInputChange: (value: string) => void
  onSubmit: (text: string, files?: File[]) => void
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
  className,
}: ChatInputProps & { className?: string }) {
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isDisabled =
    disabled ?? (status === "streaming" || (!input.trim() && filePreviews.length === 0))

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const validFiles = files.filter((f) => SUPPORTED_MIME_TYPES.includes(f.type))

    for (const file of validFiles) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreviews((prev) => [
          ...prev,
          {
            file,
            url: reader.result as string,
            type: getFileType(file.type),
          },
        ])
      }
      reader.readAsDataURL(file)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeFile = (index: number) => {
    setFilePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (text: string) => {
    if (!text.trim() && filePreviews.length === 0) return
    const files = filePreviews.map((fp) => fp.file)
    onSubmit(text, files.length > 0 ? files : undefined)
    setFilePreviews([])
  }

  // Gemini supports multimodal input
  const supportsFiles = model === "gemini-2.5-flash"

  const renderFilePreview = (preview: FilePreview, index: number) => {
    const baseClasses = "size-16 rounded-lg border flex items-center justify-center bg-muted"

    return (
      <div key={index} className="relative group">
        {preview.type === "image" ? (
          <img src={preview.url} alt={preview.file.name} className="size-16 object-cover rounded-lg border" />
        ) : (
          <div className={baseClasses} title={preview.file.name}>
            {preview.type === "video" && <Film className="size-6 text-muted-foreground" />}
            {preview.type === "audio" && <Music className="size-6 text-muted-foreground" />}
            {(preview.type === "document" || preview.type === "text") && (
              <FileIcon className="size-6 text-muted-foreground" />
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => removeFile(index)}
          className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="size-3" />
        </button>
        <span className="absolute bottom-0 left-0 right-0 text-[10px] text-center truncate px-1 bg-black/50 text-white rounded-b-lg">
          {preview.file.name.length > 10 ? `${preview.file.name.slice(0, 8)}...` : preview.file.name}
        </span>
      </div>
    )
  }

  return (
    <PromptInput className={className} onSubmit={({ text }) => handleSubmit(text)}>
      <PromptInputBody>
        {filePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 pb-0">
            {filePreviews.map((preview, index) => renderFilePreview(preview, index))}
          </div>
        )}
        <PromptInputTextarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[60px]"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_STRING}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
            onClick={() => fileInputRef.current?.click()}
            disabled={!supportsFiles}
            title={supportsFiles ? "Add file (image, video, audio, PDF, text)" : "Current model does not support file uploads"}
          >
            <ImageIcon className="size-5" />
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
