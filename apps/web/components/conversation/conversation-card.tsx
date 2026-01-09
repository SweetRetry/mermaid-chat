"use client"

import { MermaidRenderer } from "@/components/mermaid/mermaid-renderer"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { FileCode2, Trash2 } from "lucide-react"
import { useMemo } from "react"

dayjs.extend(relativeTime)

export interface Conversation {
  id: string
  title: string
  updatedAt: Date | string
  latestChartCode: string | null
}

interface ConversationCardProps {
  conversation: Conversation
  isActive?: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  className?: string
  showPreview?: boolean
}

export function ConversationCard({
  conversation,
  isActive,
  onSelect,
  onDelete,
  className,
  showPreview = true,
}: ConversationCardProps) {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(conversation.id)
  }

  const hueRotation = useMemo(() => {
    return conversation.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  }, [conversation.id])

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect(conversation.id)
        }
      }}
      className={cn(
        "group relative w-full rounded-2xl border transition-all duration-300 overflow-hidden text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        isActive
          ? "bg-accent/40 border-primary/20 shadow-sm ring-1 ring-primary/10"
          : "bg-background border-border/50 hover:border-primary/20 hover:bg-accent/20",
        className
      )}
    >
      {/* Card Header/Preview */}
      <div className="relative aspect-video overflow-hidden bg-muted/30">
        {conversation.latestChartCode && showPreview ? (
          <div className="absolute inset-0 flex items-center justify-center p-3 bg-background/20 backdrop-blur-[2px]">
            <MermaidRenderer
              code={conversation.latestChartCode}
              showLoading={false}
              showError={false}
              className="size-full pointer-events-none scale-90"
            />
          </div>
        ) : (
          <div
            className="size-full transition-all duration-500"
            style={{ filter: `hue-rotate(${hueRotation}deg)` }}
          >
            <img
              alt="Conversation placeholder"
              className="aspect-video w-full object-cover brightness-[0.8] grayscale-[0.3] group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-500"
              src="https://images.unsplash.com/photo-1604076850742-4c7221f3101b?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            />
          </div>
        )}

        {/* Delete Button Overlay */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
          aria-label="Delete conversation"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Card Content */}
      <div className="p-3.5 space-y-1.5">
        <div className="flex items-center gap-2">
          {conversation.latestChartCode && <FileCode2 className="size-3.5 text-primary shrink-0" />}
          <span className="font-bold text-sm truncate leading-tight flex-1">
            {conversation.title || "Untitled Conversation"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
            {dayjs(conversation.updatedAt).fromNow()}
          </span>
          {isActive && (
            <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
          )}
        </div>
      </div>
    </button>
  )
}
