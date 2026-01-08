"use client"

import type { Conversation } from "@/components/conversation/conversation-selector"
import { useConversations } from "@/hooks/use-conversations"
import { useChatStore } from "@/lib/store/chat-store"
import { Button } from "@workspace/ui/components/button"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { MessageSquare, Plus, Trash2 } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useMemo } from "react"

interface AppSidebarProps {
  className?: string
}

export function AppSidebar({ className }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const deleteConversation = useChatStore((state) => state.deleteConversation)
  const { conversations, isLoading: isLoadingConversations } = useConversations()

  const conversationId = useMemo(() => {
    const match = pathname.match(/^\/chat\/([^/]+)/)
    return match?.[1] ?? null
  }, [pathname])

  const handleSelect = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`)
    },
    [router]
  )

  const handleCreate = useCallback(() => {
    router.push("/")
  }, [router])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation(id)
      if (id === conversationId) {
        router.push("/")
      }
    },
    [deleteConversation, conversationId, router]
  )

  return (
    <>
      <SidebarHeader className={cn("p-4", className)}>
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "flex items-center gap-2.5 group cursor-default",
              isCollapsed && "justify-center"
            )}
          >
            <div className="size-6 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-105 transition-all duration-300 ring-2 ring-primary/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <title>Mermaid Logo</title>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            {!isCollapsed && (
              <span className="text-foreground font-bold tracking-tight text-base">
                Mermaid Chat
              </span>
            )}
          </div>
          {!isCollapsed && <SidebarTrigger className="size-7" />}
        </div>

        {!isCollapsed && (
          <Button
            onClick={handleCreate}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-lg font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mt-4"
          >
            <Plus className="size-5" />
            <span>New Chat</span>
          </Button>
        )}

        {isCollapsed && (
          <Button
            onClick={handleCreate}
            size="icon"
            className="w-full rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-lg"
            title="New Chat"
          >
            <Plus className="size-5" />
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Recent Chats
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            {isLoadingConversations ? (
              <ConversationListSkeleton isCollapsed={isCollapsed} />
            ) : conversations.length === 0 ? (
              <EmptyConversationList isCollapsed={isCollapsed} />
            ) : (
              <SidebarMenu>
                {conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={conversation.id === conversationId}
                    isCollapsed={isCollapsed}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                  />
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  )
}

function ConversationListSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="size-8 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2 px-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2 py-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

function EmptyConversationList({ isCollapsed }: { isCollapsed: boolean }) {
  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center py-4 opacity-50">
        <MessageSquare className="size-5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-500">
      <div className="space-y-4 opacity-50">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <MessageSquare className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">No recent chats</p>
          <p className="text-[11px]">Start a new conversation to see it here.</p>
        </div>
      </div>
    </div>
  )
}

interface ConversationItemProps {
  conversation: Conversation
  isActive?: boolean
  isCollapsed: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function ConversationItem({
  conversation,
  isActive,
  isCollapsed,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(conversation.id)
  }

  return (
    <SidebarMenuItem className="group/item relative">
      <SidebarMenuButton
        isActive={isActive}
        onClick={() => onSelect(conversation.id)}
        tooltip={isCollapsed ? conversation.title || "Untitled Conversation" : undefined}
        className={cn("h-auto py-3", !isCollapsed && "flex-col items-start gap-1")}
      >
        {isCollapsed ? (
          <MessageSquare className="size-4" />
        ) : (
          <>
            <span className="font-semibold text-sm truncate w-full">
              {conversation.title || "Untitled Conversation"}
            </span>
            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
              {new Date(conversation.updatedAt).toLocaleDateString()}
            </span>
          </>
        )}
      </SidebarMenuButton>
      {!isCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 size-7 opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={handleDeleteClick}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </SidebarMenuItem>
  )
}
