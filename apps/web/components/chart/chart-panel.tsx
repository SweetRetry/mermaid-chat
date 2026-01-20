"use client"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { useMemo, useState } from "react"
import { BarChart3, GitBranch } from "lucide-react"
import type { ChartsData, ChartType, UpdateChartToolUIPart } from "@/types/tool"
import type { ConversationDetail } from "@/types/chat"
import { EChartsRenderer } from "@/components/echarts/echarts-renderer"
import { MermaidRenderer } from "@/components/mermaid/mermaid-renderer"
import {
  createContextMenuPlugin,
  createNodeSelectionPlugin,
  createTransformPlugin,
} from "@/components/mermaid/plugins"
import { ChartEmptyState } from "./chart-empty-state"

interface ChartPanelProps {
  className?: string
  conversationDetail: ConversationDetail | null
  selectedChartMessageId: string | null
  onSelectedChartMessageIdChange: (id: string | null) => void
  isLoadingConversation: boolean
  onAppendInputText: (text: string) => void
  onFixError?: (error: string, chartType: ChartType) => void
  charts: ChartsData
  isChartUpdating: boolean
  onExportImage?: (dataUrl: string) => void
}

export function ChartPanel({
  className,
  conversationDetail,
  selectedChartMessageId,
  onSelectedChartMessageIdChange,
  isLoadingConversation,
  onAppendInputText,
  onFixError,
  charts,
  isChartUpdating,
  onExportImage,
}: ChartPanelProps) {
  const plugins = useMemo(
    () => [
      createContextMenuPlugin(),
      createTransformPlugin(),
      createNodeSelectionPlugin({ onNodeSelect: onAppendInputText }),
    ],
    [onAppendInputText]
  )

  // Determine which charts are available
  const hasMermaid = Boolean(charts.mermaid?.code)
  const hasECharts = Boolean(charts.echarts?.code)
  const hasBothCharts = hasMermaid && hasECharts
  const hasAnyChart = hasMermaid || hasECharts

  // Active tab state - default to whichever chart exists, or mermaid
  const [activeTab, setActiveTab] = useState<ChartType>(() => {
    if (hasECharts && !hasMermaid) return "echarts"
    return "mermaid"
  })

  // Adjust active tab if the current chart becomes unavailable
  const effectiveTab = activeTab === "echarts" && !hasECharts ? "mermaid" : activeTab === "mermaid" && !hasMermaid ? "echarts" : activeTab

  // Handle selected message (viewing old version)
  const selectedMessage = selectedChartMessageId
    ? conversationDetail?.messages.find((msg) => msg.id === selectedChartMessageId)
    : undefined

  // Find chart tool parts from selected message
  const mermaidPart = selectedMessage?.parts?.find(
    (part) => part.type === "tool-update_mermaid_chart"
  ) as UpdateChartToolUIPart | undefined
  const echartsPart = selectedMessage?.parts?.find(
    (part) => part.type === "tool-update_echarts_chart"
  ) as UpdateChartToolUIPart | undefined

  // Get code from tool part
  const getCodeFromPart = (part: UpdateChartToolUIPart | undefined) => {
    if (!part) return undefined
    return part.state === "output-available"
      ? part.output?.code || part.input?.code
      : part.input?.code
  }

  const selectedMermaidCode = getCodeFromPart(mermaidPart)
  const selectedEChartsCode = getCodeFromPart(echartsPart)

  // Determine what to view
  const viewMermaidCode = selectedMermaidCode ?? charts.mermaid?.code
  const viewEChartsCode = selectedEChartsCode ?? charts.echarts?.code

  const isViewingOldMermaid = Boolean(selectedMermaidCode && selectedMermaidCode !== charts.mermaid?.code)
  const isViewingOldECharts = Boolean(selectedEChartsCode && selectedEChartsCode !== charts.echarts?.code)
  const isViewingOldVersion = isViewingOldMermaid || isViewingOldECharts

  if (isLoadingConversation) {
    return (
      <div className={cn("flex flex-col h-full items-center justify-center p-8", className)}>
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="flex justify-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {hasAnyChart ? (
        <div className="relative h-full flex flex-col">
          {/* Tab switcher - only show when both charts exist */}
          {hasBothCharts && (
            <div className="absolute top-4 right-4 z-20 flex gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border shadow-sm">
              <Button
                variant={effectiveTab === "mermaid" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 gap-1.5"
                onClick={() => setActiveTab("mermaid")}
              >
                <GitBranch className="size-3.5" />
                Mermaid
              </Button>
              <Button
                variant={effectiveTab === "echarts" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 gap-1.5"
                onClick={() => setActiveTab("echarts")}
              >
                <BarChart3 className="size-3.5" />
                ECharts
              </Button>
            </div>
          )}

          {/* Chart content */}
          <div className="flex-1 relative">
            {effectiveTab === "echarts" && viewEChartsCode ? (
              <EChartsRenderer
                code={viewEChartsCode}
                className="h-full"
                isUpdating={isChartUpdating}
                onFixError={isViewingOldECharts ? undefined : (err) => onFixError?.(err, "echarts")}
                onExportImage={isViewingOldECharts ? undefined : onExportImage}
              />
            ) : viewMermaidCode ? (
              <MermaidRenderer
                code={viewMermaidCode}
                className="h-full"
                plugins={plugins}
                isUpdating={isChartUpdating}
                onFixError={isViewingOldMermaid ? undefined : (err) => onFixError?.(err, "mermaid")}
              />
            ) : null}
          </div>

          {/* Back to latest button */}
          {isViewingOldVersion && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
              <Button
                variant="default"
                size="sm"
                className="shadow-lg"
                onClick={() => onSelectedChartMessageIdChange(null)}
              >
                Back to latest
              </Button>
            </div>
          )}
        </div>
      ) : (
        <ChartEmptyState />
      )}
    </div>
  )
}
