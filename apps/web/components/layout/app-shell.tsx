"use client"

import { ChatPanel } from "@/components/chat/chat-panel"
import {
  type Conversation,
  ConversationSelector,
} from "@/components/conversation/conversation-selector"
import { MermaidPanel } from "@/components/mermaid/mermaid-panel"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Layout } from "react-resizable-panels"

const MODELS = [
  { id: "deepseek-chat", name: "DeepSeek" },
  { id: "claude-sonnet", name: "Claude Sonnet" },
] as const

interface ConversationDetail {
  id: string
  title: string
  messages: Array<{
    id: string
    role: "user" | "assistant"
    content: string
    createdAt: string
  }>
  latestChart: { mermaidCode: string } | null
}

interface AppShellProps {
  defaultLayout?: Layout
  groupId: string
}

export function AppShell({ defaultLayout, groupId }: AppShellProps) {
  const [mermaidCode, setMermaidCode] = useState("")
  const [model, setModel] = useState<string>("deepseek-chat")

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null)
  const [loadingCount, setLoadingCount] = useState(0)
  const [autoCreateRequested, setAutoCreateRequested] = useState(false)
  const latestConversationRequest = useRef(0)

  const loading = loadingCount > 0

  const withLoading = useCallback(async (task: () => Promise<void>) => {
    setLoadingCount((count) => count + 1)
    try {
      await task()
    } finally {
      setLoadingCount((count) => Math.max(0, count - 1))
    }
  }, [])

  const handleLayoutChange = useCallback(
    (layout: Layout) => {
      const encoded = encodeURIComponent(JSON.stringify(layout))
      document.cookie = `${groupId}=${encoded}; path=/; max-age=31536000; samesite=lax`
    },
    [groupId]
  )

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    await withLoading(async () => {
      try {
        const res = await fetch("/api/conversations")
        if (res.ok) {
          const data = await res.json()
          setConversations(data.conversations)
        }
      } catch {
        // Ignore transient fetch errors; UI remains unchanged.
      }
    })
  }, [withLoading])

  // Load a specific conversation
  const loadConversation = useCallback(
    async (id: string) => {
      const requestId = latestConversationRequest.current + 1
      latestConversationRequest.current = requestId
      await withLoading(async () => {
        try {
          const res = await fetch(`/api/conversations/${id}`)
          if (res.ok) {
            const data: ConversationDetail = await res.json()
            if (latestConversationRequest.current !== requestId) {
              return
            }
            setConversationId(id)
            setConversationDetail(data)
            setMermaidCode(data.latestChart?.mermaidCode ?? "")
          }
        } catch {
          // Ignore transient fetch errors; UI remains unchanged.
        }
      })
    },
    [withLoading]
  )

  // Create a new conversation
  const createConversation = useCallback(async () => {
    await withLoading(async () => {
      try {
        const res = await fetch("/api/conversations", { method: "POST" })
        if (res.ok) {
          const data = await res.json()
          setConversations((prev) => [data, ...prev])
          setConversationId(data.id)
          setConversationDetail({
            id: data.id,
            title: data.title,
            messages: [],
            latestChart: null,
          })
          setMermaidCode("")
        }
      } catch {
        // Ignore transient create errors; UI remains unchanged.
      }
    })
  }, [withLoading])

  // Delete a conversation
  const deleteConversation = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" })
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        if (conversationId === id) {
          setConversationId(null)
          setConversationDetail(null)
          setMermaidCode("")
        }
      }
    },
    [conversationId]
  )

  // Refresh conversation list after chat
  const handleConversationUpdate = useCallback(() => {
    fetchConversations()
  }, [fetchConversations])

  // Initial load
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (conversations.length > 0) {
      setAutoCreateRequested(false)
    }
  }, [conversations.length])

  // Auto-create conversation if none exists
  useEffect(() => {
    if (conversations.length === 0 && !loading && !conversationId && !autoCreateRequested) {
      setAutoCreateRequested(true)
      createConversation()
    }
  }, [conversations.length, loading, conversationId, autoCreateRequested, createConversation])

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
          <div className="h-6 w-px bg-border/60 mx-1" />
          <ConversationSelector
            conversations={conversations}
            currentId={conversationId}
            onSelect={loadConversation}
            onNew={createConversation}
            onDelete={deleteConversation}
            loading={loading}
          />
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
            <MermaidPanel code={mermaidCode} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            id="chat"
            defaultSize={25}
            minSize={25}
            className="min-w-0"
            style={{ flexBasis: "25%" }}
          >
            <ChatPanel
              key={conversationId}
              currentChart={mermaidCode}
              onChartUpdate={setMermaidCode}
              model={model}
              models={MODELS}
              onModelChange={setModel}
              conversationId={conversationId}
              initialMessages={conversationDetail?.messages ?? []}
              onConversationUpdate={handleConversationUpdate}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  )
}
