"use client"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { useMemo } from "react"
import type { ChartType, UpdateChartToolUIPart } from "@/types/tool"
import type { ConversationDetail } from "@/types/chat"
import { EChartsRenderer } from "@/components/echarts/echarts-renderer"
import { MermaidRenderer } from "@/components/mermaid/mermaid-renderer"
import {
  createContextMenuPlugin,
  createDocViewPlugin,
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
  onFixError?: (error: string) => void
  latestChartCode: string
  latestChartType: ChartType
  isChartUpdating: boolean
  onDocumentChange?: (document: string | null) => void
  /** Callback when user exports chart as image (data URL) */
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
  latestChartCode,
  latestChartType,
  isChartUpdating,
  onDocumentChange,
  onExportImage,
}: ChartPanelProps) {
  const plugins = useMemo(
    () => [
      createContextMenuPlugin(),
      createTransformPlugin(),
      createDocViewPlugin(),
      createNodeSelectionPlugin({ onNodeSelect: onAppendInputText }),
    ],
    [onAppendInputText]
  )

  const selectedMessage = selectedChartMessageId
    ? conversationDetail?.messages.find((msg) => msg.id === selectedChartMessageId)
    : undefined

  const selectedPart = selectedMessage?.parts?.find((part) => part.type === "tool-update_chart") as
    | UpdateChartToolUIPart
    | undefined

  const selectedCode =
    selectedPart?.state === "output-available"
      ? selectedPart.output?.code || selectedPart.input?.code
      : selectedPart?.input?.code

  const selectedType =
    selectedPart?.state === "output-available"
      ? selectedPart.output?.chartType || selectedPart.input?.chartType
      : selectedPart?.input?.chartType

  const viewCode = selectedCode ?? latestChartCode
  const viewType = selectedType ?? latestChartType
  const isViewingOldVersion = Boolean(
    selectedChartMessageId && viewCode && viewCode !== latestChartCode
  )

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
      {viewCode ? (
        <div className="relative h-full">
          {viewType === "echarts" ? (
            <EChartsRenderer
              code={viewCode}
              className="h-full"
              isUpdating={isChartUpdating}
              onFixError={isViewingOldVersion ? undefined : onFixError}
              onExportImage={isViewingOldVersion ? undefined : onExportImage}
            />
          ) : (
            <MermaidRenderer
              code={viewCode}
              className="h-full"
              plugins={plugins}
              isUpdating={isChartUpdating}
              onFixError={isViewingOldVersion ? undefined : onFixError}
              conversationId={conversationDetail?.id}
              documentContent={conversationDetail?.document}
              onDocumentChange={onDocumentChange}
            />
          )}
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
