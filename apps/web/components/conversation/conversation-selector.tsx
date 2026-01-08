"use client"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"
import { ChevronDown, MessageSquarePlus, Trash2 } from "lucide-react"

export interface Conversation {
  id: string
  title: string
  updatedAt: Date | string
}

interface ConversationSelectorProps {
  conversations: Conversation[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  loading?: boolean
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString()
}

export function ConversationSelector({
  conversations,
  currentId,
  onSelect,
  onNew,
  onDelete,
  loading,
}: ConversationSelectorProps) {
  const current = conversations.find((c) => c.id === currentId)

  return (
    <div className="flex items-center gap-1.5 p-1 bg-background/40 backdrop-blur-sm rounded-xl">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="px-2 h-8 font-medium hover:bg-background/80 transition-all"
            disabled={loading}
          >
            <span className="truncate max-w-[140px]">
              {current?.title ?? "Select conversation"}
            </span>
            <ChevronDown className="ml-1 h-3 w-3 opacity-50 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[300px] p-2 rounded-xl shadow-xl border-muted"
        >
          <ScrollArea className="max-h-[350px]">
            {conversations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="flex justify-center mb-3">
                  <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center">
                    <MessageSquarePlus className="size-5 text-muted-foreground/50" />
                  </div>
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  No conversations yet
                </div>
                <div className="text-xs text-muted-foreground/60 mt-1">
                  Start a new chat to begin
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <DropdownMenuItem
                    key={conversation.id}
                    className={cn(
                      "flex items-center justify-between group cursor-pointer p-2.5 rounded-lg transition-colors",
                      currentId === conversation.id ? "bg-primary/5 text-primary" : ""
                    )}
                    onSelect={(e) => {
                      e.preventDefault()
                      onSelect(conversation.id)
                    }}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="truncate font-semibold text-sm">{conversation.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-medium">
                        {formatDate(conversation.updatedAt)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 opacity-0 group-hover:opacity-100 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-all"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(conversation.id)
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </ScrollArea>
          <DropdownMenuSeparator className="my-2" />
          <DropdownMenuItem
            onSelect={onNew}
            className="cursor-pointer flex items-center gap-2 p-2.5 rounded-lg text-primary hover:bg-primary/5 font-medium transition-all"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New Conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-4 bg-border mx-0.5" />

      <Button
        variant="ghost"
        size="icon"
        className="size-8 hover:bg-primary hover:text-primary-foreground transition-all shadow-none"
        onClick={onNew}
        disabled={loading}
        title="New conversation"
      >
        <MessageSquarePlus className="size-4" />
      </Button>
    </div>
  )
}
