"use client"

import type { Conversation } from "@/components/conversation/conversation-selector"
import { useConversationsContext } from "@/components/conversation/conversations-context"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarContent,
  SidebarFooter,
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
import { ChevronUp, MessageSquare, Monitor, Moon, Plus, Sun, Trash2 } from "lucide-react"
import { useTheme } from "next-themes"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"

interface AppSidebarProps {
  className?: string
}

export function AppSidebar({ className }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const {
    conversations,
    isLoading: isLoadingConversations,
    deleteConversation,
  } = useConversationsContext()

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

      <SidebarFooter className="p-4">
        <ThemeSwitcher isCollapsed={isCollapsed} />
      </SidebarFooter>
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

function ThemeSwitcher({ isCollapsed }: { isCollapsed: boolean }) {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const modes = [
    { name: "light", icon: Sun, label: "Light" },
    { name: "dark", icon: Moon, label: "Dark" },
    { name: "system", icon: Monitor, label: "System" },
  ] as const

  const currentMode = modes.find((m) => m.name === theme) || modes[2]
  const Icon = currentMode.icon

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          isActive={isOpen}
          className={cn(
            "w-full h-12 rounded-xl transition-all duration-300 hover:bg-accent/50",
            isOpen && "bg-accent"
          )}
        >
          <div className="flex items-center gap-3 w-full">
            <div className="size-8 rounded-lg bg-background border flex items-center justify-center text-primary shadow-sm shrink-0">
              <Icon className="size-4" />
            </div>
            {!isCollapsed && (
              <>
                <div className="flex flex-col items-start flex-1 min-w-0 text-left">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none mb-1">
                    Theme
                  </span>
                  <span className="text-sm font-semibold text-foreground leading-none truncate w-full">
                    {currentMode.label}
                  </span>
                </div>
                <ChevronUp
                  className={cn(
                    "size-4 text-muted-foreground/50 shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </>
            )}
          </div>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={isCollapsed ? "right" : "bottom"}
        align={isCollapsed ? "end" : "center"}
        className="w-48 p-1.5 rounded-xl border-border bg-popover/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 shadow-2xl"
      >
        {modes.map((mode) => (
          <DropdownMenuItem
            key={mode.name}
            onClick={() => setTheme(mode.name)}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
              theme === mode.name
                ? "bg-primary/5 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <mode.icon className="size-4" />
            <span className="text-sm">{mode.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
