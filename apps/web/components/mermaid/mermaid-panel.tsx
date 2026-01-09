"use client"

import type { ConversationDetail } from "@/types/chat"
import type { UpdateChartToolUIPart } from "@/types/tool"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { useMemo } from "react"
import { MermaidEmptyState } from "./mermaid-empty-state"
import { MermaidRenderer } from "./mermaid-renderer"
import {
  createCodeViewPlugin,
  createExportPlugin,
  createNodeSelectionPlugin,
  createTransformPlugin,
} from "./plugins"

interface MermaidPanelProps {
  className?: string
  conversationDetail: ConversationDetail | null
  selectedMermaidMessageId: string | null
  onSelectedMermaidMessageIdChange: (id: string | null) => void
  isLoadingConversation: boolean
  onAppendInputText: (text: string) => void
  onFixError?: (error: string) => void
  latestMermaidCode: string
  isMermaidUpdating: boolean
}

export function MermaidPanel({
  className,
  conversationDetail,
  selectedMermaidMessageId,
  onSelectedMermaidMessageIdChange,
  isLoadingConversation,
  onAppendInputText,
  onFixError,
  latestMermaidCode,
  isMermaidUpdating,
}: MermaidPanelProps) {

  const plugins = useMemo(
    () => [
      createTransformPlugin(),
      createExportPlugin(),
      createCodeViewPlugin(),
      createNodeSelectionPlugin({ onNodeSelect: onAppendInputText }),
    ],
    [onAppendInputText]
  )

  const selectedMessage = selectedMermaidMessageId
    ? conversationDetail?.messages.find((msg) => msg.id === selectedMermaidMessageId)
    : undefined

  const selectedPart = selectedMessage?.parts?.find((part) => part.type === "tool-update_chart") as
    | UpdateChartToolUIPart
    | undefined

  const selectedCode =
    selectedPart?.state === "output-available"
      ? selectedPart.output?.code
      : selectedPart?.input?.code

  const viewCode = selectedCode ?? latestMermaidCode
  const isViewingOldVersion = Boolean(
    selectedMermaidMessageId && viewCode && viewCode !== latestMermaidCode
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
          <MermaidRenderer
            code={viewCode}
            className="h-full"
            plugins={plugins}
            isUpdating={isMermaidUpdating}
            onFixError={isViewingOldVersion ? undefined : onFixError}
          />
          {isViewingOldVersion && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
              <Button
                variant="default"
                size="sm"
                className="shadow-lg"
                onClick={() => onSelectedMermaidMessageIdChange(null)}
              >
                Back to latest
              </Button>
            </div>
          )}
        </div>
      ) : (
        <MermaidEmptyState />
      )}
    </div>
  )
}
