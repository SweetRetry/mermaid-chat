"use client"

import { ChatPanel } from "@/components/chat/chat-panel"
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
  const loading = useChatStore((state) => state.loadingCount > 0)
  const fetchConversations = useChatStore((state) => state.fetchConversations)

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
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b bg-background/80 backdrop-blur-md transition-all">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 group cursor-default">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
              >
                <title>Mermaid Logo</title>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Mermaid Chat
            </h1>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground animate-in fade-in duration-300">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-xs font-medium">Syncing...</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full w-full overflow-hidden"
          id={groupId}
          defaultLayout={defaultLayout}
          onLayoutChange={handleLayoutChange}
        >
          <ResizablePanel
            id="preview"
            defaultSize={75}
            minSize={30}
            className="min-w-0"
            style={{ flexBasis: "75%" }}
          >
            <MermaidPanel />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            id="chat"
            defaultSize={25}
            minSize={25}
            className="min-w-0"
            style={{ flexBasis: "25%" }}
          >
            <ChatPanel key={conversationId ?? "empty"} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  )
}
