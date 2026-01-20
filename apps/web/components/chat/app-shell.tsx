"use client"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import type { Layout } from "react-resizable-panels"
import { ChatPanel, type ChatPanelHandle } from "@/components/chat/chat-panel"
import { ChartPanel } from "@/components/chart/chart-panel"
import { useConversation } from "@/hooks/use-conversation"
import type { ChartsData, ChartTarget, ChartType } from "@/types/tool"

interface AppShellProps {
  defaultLayout?: Layout
  groupId: string
}

export function AppShell({ defaultLayout, groupId }: AppShellProps) {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { conversationDetail, isLoading: isLoadingConversation } = useConversation(conversationId)
  const [selectedChartMessageId, setSelectedChartMessageId] = useState<string | null>(null)
  const [inputText, setInputText] = useState("")
  const chatPanelRef = useRef<ChatPanelHandle>(null)

  // State for streaming/override charts (null = use conversation data)
  const [streamingCharts, setStreamingCharts] = useState<ChartsData>({})
  const [isChartUpdating, setIsChartUpdating] = useState(false)
  const [chartTarget, setChartTarget] = useState<ChartTarget>("auto")

  // Merge streaming state with conversation data
  const charts: ChartsData = {
    mermaid: streamingCharts.mermaid ?? conversationDetail?.charts?.mermaid,
    echarts: streamingCharts.echarts ?? conversationDetail?.charts?.echarts,
  }

  // Update a single chart
  const updateChart = useCallback((type: ChartType, code: string) => {
    setStreamingCharts((prev) => ({
      ...prev,
      [type]: { code, updatedAt: new Date().toISOString() },
    }))
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

  const handleFixError = useCallback(
    (error: string, chartType: ChartType) => {
      const chartTypeName = chartType === "echarts" ? "ECharts" : "Mermaid"
      const fixPrompt = `The ${chartTypeName} chart has a render error. Please fix it.

Error: ${error}

If this error is difficult to fix directly, try simplifying the syntax complexity while preserving the same semantic meaning.${
        chartType === "mermaid"
          ? ` For example:
- Use shorter node labels or IDs
- Replace complex subgraphs with simpler structures
- Avoid advanced features that may have compatibility issues`
          : ` For example:
- Ensure the JSON is valid and properly formatted
- Check for missing required properties
- Simplify complex nested configurations`
      }`
      setInputText(fixPrompt)
      requestAnimationFrame(() => {
        chatPanelRef.current?.sendTextMessage(fixPrompt)
        setInputText("")
      })
    },
    []
  )

  const handleExportImage = useCallback((dataUrl: string) => {
    chatPanelRef.current?.addImageAttachment(dataUrl, "chart.png")
  }, [])

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
          <ChartPanel
            className="h-full"
            conversationDetail={conversationDetail}
            selectedChartMessageId={selectedChartMessageId}
            onSelectedChartMessageIdChange={setSelectedChartMessageId}
            isLoadingConversation={isLoadingConversation}
            onAppendInputText={handleAppendInputText}
            onFixError={handleFixError}
            charts={charts}
            isChartUpdating={isChartUpdating}
            onExportImage={handleExportImage}
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
            onSelectChartMessage={setSelectedChartMessageId}
            inputText={inputText}
            onInputTextChange={setInputText}
            charts={charts}
            updateChart={updateChart}
            setIsChartUpdating={setIsChartUpdating}
            chartTarget={chartTarget}
            onChartTargetChange={setChartTarget}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
