"use client"

import type { Conversation } from "@/components/conversation/conversation-selector"
import { EXAMPLES } from "@/lib/constants/examples"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { MessageSquare, Plus } from "lucide-react"

interface ConversationListViewProps {
  conversations: Conversation[]
  onSelect: (id: string) => void
  onCreate: () => void
  onSelectExample: (prompt: string) => void
  className?: string
}

export function ConversationListView({
  conversations,
  onSelect,
  onCreate,
  onSelectExample,
  className,
}: ConversationListViewProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-4 bg-transparent">
        <Button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-lg h-12 font-bold"
        >
          <Plus className="size-5" />
          <span>New Chat</span>
        </Button>
      </div>
      <div className="px-4 py-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2">
          Recent Chats
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-3">
        {conversations.length === 0 ? (
          <EmptyConversationList onSelectExample={onSelectExample} />
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}

function EmptyConversationList({ onSelectExample }: { onSelectExample: (prompt: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4 opacity-50">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <MessageSquare className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">No recent chats</p>
          <p className="text-[11px]">Start a new conversation to see it here.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full max-w-[280px]">
        {EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => onSelectExample(example.prompt)}
            className="p-3.5 rounded-2xl border border-muted/20 bg-background/40 backdrop-blur-sm shadow-sm text-xs text-muted-foreground hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all text-left group flex flex-col gap-1"
          >
            <div className="font-bold tracking-tight group-hover:text-primary transition-colors text-foreground">
              {example.label}
            </div>
            <div className="opacity-40 text-[10px] font-medium uppercase tracking-wider">
              Click to generate
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

interface ConversationItemProps {
  conversation: Conversation
  onSelect: (id: string) => void
}

function ConversationItem({ conversation, onSelect }: ConversationItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className="w-full flex flex-col p-4 rounded-2xl border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
    >
      <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
        {conversation.title || "Untitled Conversation"}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
          {new Date(conversation.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </button>
  )
}
