"use client"

import { ChatPanel } from "@/components/chat/chat-panel"
import { MermaidContextProvider } from "@/components/mermaid/mermaid-context"
import { MermaidPanel } from "@/components/mermaid/mermaid-panel"
import { useConversation } from "@/hooks/use-conversation"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { SidebarTrigger, useSidebar } from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { Layout } from "react-resizable-panels"

interface AppShellProps {
  defaultLayout?: Layout
  groupId: string
  conversationId?: string
}

export function AppShell({ defaultLayout, groupId, conversationId }: AppShellProps) {
  const { conversationDetail, isLoading: isLoadingConversation } = useConversation(conversationId)
  const [selectedMermaidMessageId, setSelectedMermaidMessageId] = useState<string | null>(null)
  const [latestMermaidCode, setLatestMermaidCode] = useState("")
  const [isMermaidUpdating, setIsMermaidUpdating] = useState(false)
  const [inputText, setInputText] = useState("")
  const { isMobile, state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const handleLayoutChange = useCallback(
    (layout: Layout) => {
      const encoded = encodeURIComponent(JSON.stringify(layout))
      document.cookie = `${groupId}=${encoded}; path=/; max-age=31536000; samesite=lax`
    },
    [groupId]
  )

  useEffect(() => {
    setSelectedMermaidMessageId(null)
    setInputText("")
  }, [conversationId])

  useEffect(() => {
    if (conversationDetail?.latestChart?.mermaidCode) {
      setLatestMermaidCode(conversationDetail.latestChart.mermaidCode)
      setIsMermaidUpdating(false)
      return
    }
    if (!conversationId) {
      setLatestMermaidCode("")
      setIsMermaidUpdating(false)
    }
  }, [conversationDetail, conversationId])

  const mermaidContextValue = useMemo(
    () => ({
      latestMermaidCode,
      setLatestMermaidCode,
      isMermaidUpdating,
      setIsMermaidUpdating,
    }),
    [latestMermaidCode, isMermaidUpdating]
  )

  const handleAppendInputText = useCallback((text: string) => {
    const next = text.trim()
    if (!next) return
    setInputText((prev) => {
      const separator = prev && !prev.endsWith(" ") ? " " : ""
      return `${prev}${separator}${next}`
    })
  }, [])

  return (
    <MermaidContextProvider value={mermaidContextValue}>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header with sidebar trigger for mobile/collapsed state */}

        {(isMobile || isCollapsed) && <SidebarTrigger className="size-7" />}
        {conversationId && (
          <div className="flex items-center rounded-xl absolute top-4 left-4">
            {isLoadingConversation ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              conversationDetail?.title || "New Diagram"
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup
            orientation="horizontal"
            id={groupId}
            defaultLayout={defaultLayout}
            onLayoutChange={handleLayoutChange}
          >
            <ResizablePanel
              id="preview"
              defaultSize={defaultLayout?.[0] ?? 70}
              minSize="50%"
              className="bg-muted/5"
            >
              <MermaidPanel
                className="max-h-screen"
                conversationDetail={conversationDetail}
                selectedMermaidMessageId={selectedMermaidMessageId}
                onSelectedMermaidMessageIdChange={setSelectedMermaidMessageId}
                isLoadingConversation={isLoadingConversation}
                onAppendInputText={handleAppendInputText}
              />
            </ResizablePanel>

            <ResizableHandle className="w-px bg-border/40 hover:bg-primary/40 transition-colors" />

            <ResizablePanel
              id="chat"
              defaultSize={defaultLayout?.[1] ?? 30}
              minSize="350px"
              className="max-h-screen"
            >
              <ChatPanel
                key={conversationId ?? "empty"}
                conversationId={conversationId}
                conversationDetail={conversationDetail}
                isLoadingConversation={isLoadingConversation}
                onSelectMermaidMessage={setSelectedMermaidMessageId}
                inputText={inputText}
                onInputTextChange={setInputText}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </MermaidContextProvider>
  )
}
