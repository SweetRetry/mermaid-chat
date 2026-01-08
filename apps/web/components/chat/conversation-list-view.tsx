"use client"

import type { Conversation } from "@/components/conversation/conversation-selector"
import { cn } from "@workspace/ui/lib/utils"
import { MessageSquare, Plus } from "lucide-react"

interface ConversationListViewProps {
  conversations: Conversation[]
  onSelect: (id: string) => void
  onCreate: () => void
  className?: string
}

export function ConversationListView({
  conversations,
  onSelect,
  onCreate,
  className,
}: ConversationListViewProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-4 h-12 border-b bg-muted/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">Recent Chats</span>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium shadow-sm"
        >
          <Plus className="size-3.5" />
          <span>New Chat</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conversations.length === 0 ? (
          <EmptyConversationList />
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

function EmptyConversationList() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-50">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <MessageSquare className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">No recent chats</p>
        <p className="text-[11px]">Start a new conversation to see it here.</p>
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
