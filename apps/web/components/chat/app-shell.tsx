"use client"

import { ChatPanel, type ChatPanelHandle } from "@/components/chat/chat-panel"
import { MermaidContextProvider } from "@/components/mermaid/mermaid-context"
import { MermaidPanel } from "@/components/mermaid/mermaid-panel"
import { useConversation } from "@/hooks/use-conversation"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Layout } from "react-resizable-panels"

// Suppress hydration warning for client-only values
const useIsClient = () => {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])
  return isClient
}

interface AppShellProps {
  defaultLayout?: Layout
  groupId: string
  conversationId?: string
}

export function AppShell({ defaultLayout, groupId, conversationId }: AppShellProps) {
  const { conversationDetail, isLoading: isLoadingConversation } = useConversation(conversationId)
  const [selectedMermaidMessageId, setSelectedMermaidMessageId] = useState<string | null>(null)
  const [inputText, setInputText] = useState("")
  const chatPanelRef = useRef<ChatPanelHandle>(null)

  // State for streaming/override mermaid code (null = use conversation data)
  const [streamingMermaidCode, setStreamingMermaidCode] = useState<string | null>(null)
  const [isMermaidUpdating, setIsMermaidUpdating] = useState(false)

  // Derive effective mermaid code: streaming override takes priority, then conversation data
  const latestMermaidCode =
    streamingMermaidCode ?? conversationDetail?.latestChart?.mermaidCode ?? ""

  // Wrapper to set mermaid code (updates streaming state)
  const setLatestMermaidCode = useCallback((code: string) => {
    setStreamingMermaidCode(code)
  }, [])

  const handleLayoutChange = useCallback(
    (layout: Layout) => {
      const encoded = encodeURIComponent(JSON.stringify(layout))
      document.cookie = `${groupId}=${encoded}; path=/; max-age=31536000; samesite=lax`
    },
    [groupId]
  )

  // Reset state when conversation changes
  useEffect(() => {
    setSelectedMermaidMessageId(null)
    setInputText("")
    setStreamingMermaidCode(null)
    setIsMermaidUpdating(false)
  }, [conversationId])

  const mermaidContextValue = useMemo(
    () => ({
      latestMermaidCode,
      setLatestMermaidCode,
      isMermaidUpdating,
      setIsMermaidUpdating,
    }),
    [latestMermaidCode, setLatestMermaidCode, isMermaidUpdating]
  )

  const handleAppendInputText = useCallback((text: string) => {
    const next = text.trim()
    if (!next) return
    setInputText((prev) => {
      const separator = prev && !prev.endsWith(" ") ? " " : ""
      return `${prev}${separator}${next}`
    })
  }, [])

  const handleFixError = useCallback((error: string) => {
    const fixPrompt = `The Mermaid diagram has a render error. Please fix it.\n\nError: ${error}`
    setInputText(fixPrompt)
    requestAnimationFrame(() => {
      chatPanelRef.current?.sendTextMessage(fixPrompt)
      setInputText("")
    })
  }, [])

  return (
    <MermaidContextProvider value={mermaidContextValue}>
      <div className="h-full flex flex-col overflow-hidden relative">
        {/* Header with logo and conversation title */}
        <div className="flex items-center shrink-0 absolute top-4 left-4 z-10">
          <Link href="/" className="flex items-center group transition-all hover:opacity-90 mr-4">
            <ArrowLeft className="size-4" />
          </Link>

          {isLoadingConversation ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <span className="text-sm font-bold truncate block tracking-tight">
              {conversationDetail?.title || "New Diagram"}
            </span>
          )}
        </div>

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
                onFixError={handleFixError}
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
                ref={chatPanelRef}
                key={`${conversationId ?? "empty"}-${isLoadingConversation ? "loading" : "ready"}`}
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
