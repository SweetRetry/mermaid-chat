"use client"

import { ChatPanel, type ChatPanelHandle } from "@/components/chat/chat-panel"
import { MermaidPanel } from "@/components/mermaid/mermaid-panel"
import { useConversation } from "@/hooks/use-conversation"
import { conversationKeys } from "@/lib/api/conversations"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import type { Layout } from "react-resizable-panels"

interface AppShellProps {
  defaultLayout?: Layout
  groupId: string
}

export function AppShell({ defaultLayout, groupId }: AppShellProps) {
  const { conversationId } = useParams<{ conversationId: string }>()
  const queryClient = useQueryClient()
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

  const handleAppendInputText = useCallback((text: string) => {
    const next = text.trim()
    if (!next) return
    setInputText((prev) => {
      const separator = prev && !prev.endsWith(" ") ? " " : ""
      return `${prev}${separator}${next}`
    })
  }, [])

  const handleFixError = useCallback((error: string) => {
    const fixPrompt = `The Mermaid diagram has a render error. Please fix it.

Error: ${error}

If this error is difficult to fix directly, try simplifying the syntax complexity while preserving the same semantic meaning. For example:
- Use shorter node labels or IDs
- Replace complex subgraphs with simpler structures
- Avoid advanced features that may have compatibility issues`
    setInputText(fixPrompt)
    requestAnimationFrame(() => {
      chatPanelRef.current?.sendTextMessage(fixPrompt)
      setInputText("")
    })
  }, [])

  const handleDocumentChange = useCallback(
    (document: string | null) => {
      // Invalidate the conversation detail cache to refresh with new document
      if (conversationId) {
        queryClient.setQueryData(conversationKeys.detail(conversationId), (old: unknown) => {
          if (old && typeof old === "object") {
            return { ...old, document }
          }
          return old
        })
      }
    },
    [conversationId, queryClient]
  )

  return (
    <div className="min-h-screen h-screen flex flex-col overflow-hidden relative">
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

      <ResizablePanelGroup
        orientation="horizontal"
        className="h-full overflow-hidden"
        id={groupId}
        defaultLayout={defaultLayout}
        onLayoutChange={handleLayoutChange}
      >
        <ResizablePanel id="preview" defaultSize={defaultLayout?.[0] ?? 70} minSize="50%">
          <MermaidPanel
            className="h-full"
            conversationDetail={conversationDetail}
            selectedMermaidMessageId={selectedMermaidMessageId}
            onSelectedMermaidMessageIdChange={setSelectedMermaidMessageId}
            isLoadingConversation={isLoadingConversation}
            onAppendInputText={handleAppendInputText}
            onFixError={handleFixError}
            latestMermaidCode={latestMermaidCode}
            isMermaidUpdating={isMermaidUpdating}
            onDocumentChange={handleDocumentChange}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel
          id="chat"
          defaultSize={defaultLayout?.[1] ?? 30}
          minSize="350px"
          className="h-full"
        >
          <ChatPanel
            ref={chatPanelRef}
            key={conversationId}
            conversationId={conversationId}
            conversationDetail={conversationDetail}
            isLoadingConversation={isLoadingConversation}
            onSelectMermaidMessage={setSelectedMermaidMessageId}
            inputText={inputText}
            onInputTextChange={setInputText}
            latestMermaidCode={latestMermaidCode}
            setLatestMermaidCode={setLatestMermaidCode}
            setIsMermaidUpdating={setIsMermaidUpdating}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
