"use client"

import { ChatPanel } from "@/components/chat/chat-panel"
import { MermaidPanel } from "@/components/mermaid/mermaid-panel"
import { useChatStore } from "@/lib/store/chat-store"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { SidebarTrigger, useSidebar } from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useCallback, useEffect } from "react"
import type { Layout } from "react-resizable-panels"

interface AppShellProps {
  defaultLayout?: Layout
  groupId: string
  conversationId?: string
}

export function AppShell({ defaultLayout, groupId, conversationId }: AppShellProps) {
  const loadConversation = useChatStore((state) => state.loadConversation)
  const clearConversation = useChatStore((state) => state.clearConversation)
  const conversationDetail = useChatStore((state) => state.conversationDetail)
  const isLoadingConversation = useChatStore((state) => state.isLoadingConversation)
  const { isMobile, state } = useSidebar()
  const isCollapsed = state === "collapsed"

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId)
    } else {
      clearConversation()
    }
  }, [conversationId, loadConversation, clearConversation])

  const handleLayoutChange = useCallback(
    (layout: Layout) => {
      const encoded = encodeURIComponent(JSON.stringify(layout))
      document.cookie = `${groupId}=${encoded}; path=/; max-age=31536000; samesite=lax`
    },
    [groupId]
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with sidebar trigger for mobile/collapsed state */}
      <header className="py-3 flex items-center px-4 gap-3">
        {(isMobile || isCollapsed) && <SidebarTrigger className="size-7" />}
        {conversationId && (
          <div className="flex items-center rounded-xl">
            {isLoadingConversation ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              conversationDetail?.title || "New Diagram"
            )}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup
          orientation="horizontal"
          id={groupId}
          defaultLayout={defaultLayout}
          onLayoutChange={handleLayoutChange}
        >
          <ResizablePanel id="preview" defaultSize={70} minSize={30} className="min-w-0 bg-muted/5">
            <MermaidPanel />
          </ResizablePanel>

          <ResizableHandle className="w-px bg-border/40 hover:bg-primary/40 transition-colors" />

          <ResizablePanel id="chat" defaultSize={30} minSize={20} className="min-w-[350px]">
            <ChatPanel key={conversationId ?? "empty"} conversationId={conversationId} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
