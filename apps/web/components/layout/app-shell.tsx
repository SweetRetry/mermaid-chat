"use client"

import { ChatPanel } from "@/components/chat/chat-panel"
import { ConversationListView } from "@/components/chat/conversation-list-view"
import { MermaidPanel } from "@/components/mermaid/mermaid-panel"
import { useChatStore } from "@/lib/store/chat-store"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect } from "react"
import type { Layout } from "react-resizable-panels"

interface AppShellProps {
  defaultLayout?: Layout
  groupId: string
}

export function AppShell({ defaultLayout, groupId }: AppShellProps) {
  const conversationId = useChatStore((state) => state.conversationId)
  const conversationDetail = useChatStore((state) => state.conversationDetail)
  const loading = useChatStore((state) => state.loadingCount > 0)
  const fetchConversations = useChatStore((state) => state.fetchConversations)
  const onCreateConversation = useChatStore((state) => state.createConversation)
  const conversations = useChatStore((state) => state.conversations)
  const onSelectConversation = useChatStore((state) => state.loadConversation)
  const handleSelectExample = useChatStore((state) => state.handleSelectExample)

  const handleLayoutChange = useCallback(
    (layout: Layout) => {
      const encoded = encodeURIComponent(JSON.stringify(layout))
      document.cookie = `${groupId}=${encoded}; path=/; max-age=31536000; samesite=lax`
    },
    [groupId]
  )

  // Initial load
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-2 bg-background/40 backdrop-blur-xl transition-all">
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-2 text-sm font-medium">
            <div className="flex items-center gap-2 group cursor-default">
              <div className="size-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
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
              <span className="text-foreground font-semibold">Mermaid Chat</span>
            </div>

            <span className="text-muted-foreground/40 font-light text-lg select-none">/</span>

            <div className="flex items-center gap-2 truncate max-w-[300px]">
              <span className="text-muted-foreground truncate">
                {conversationId ? conversationDetail?.title || "New Diagram" : "Dashboard"}
              </span>
              {loading && (
                <div className="flex items-center gap-2 ml-2 text-muted-foreground/60 animate-in fade-in duration-300">
                  <Loader2 className="size-3 animate-spin" />
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10" />
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full w-full overflow-hidden"
          id={groupId}
          defaultLayout={defaultLayout}
          onLayoutChange={handleLayoutChange}
        >
          <ResizablePanel
            id="sidebar"
            defaultSize={20}
            minSize={15}
            className="min-w-[200px] border-r"
          >
            <ConversationListView
              conversations={conversations}
              onSelect={onSelectConversation}
              onCreate={onCreateConversation}
              onSelectExample={handleSelectExample}
            />
          </ResizablePanel>

          <ResizableHandle className="w-0.5 bg-border/20 hover:bg-primary/20 transition-colors" />

          <ResizablePanel id="preview" defaultSize={55} minSize={30} className="min-w-0">
            <MermaidPanel />
          </ResizablePanel>

          <ResizableHandle className="w-0.5 bg-border/20 hover:bg-primary/20 transition-colors" />

          <ResizablePanel id="chat" defaultSize={25} minSize={20} className="min-w-[300px]">
            <ChatPanel key={conversationId ?? "empty"} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  )
}
