"use client"

import { MessageResponse } from "@workspace/ui/ai-elements/message"
import { Tool, ToolContent, ToolHeader } from "@workspace/ui/ai-elements/tool"
import { Button } from "@workspace/ui/components/button"
import { BarChart3, Eye, GitBranch } from "lucide-react"
import type { ChartType, UpdateChartToolUIPart } from "@/types/tool"

interface ToolCallRendererProps {
  toolPart: UpdateChartToolUIPart
  toolType: "update_mermaid_chart" | "update_echarts_chart"
  messageId: string
  onSelectChartMessage: (id: string | null) => void
}

export function ToolCallRenderer({
  toolPart,
  toolType,
  messageId,
  onSelectChartMessage,
}: ToolCallRendererProps) {
  const isComplete = toolPart.state === "output-available"
  const description = isComplete ? toolPart.output?.description : toolPart.input?.description
  const code = isComplete ? toolPart.output?.code : toolPart.input?.code

  const isECharts = toolType === "update_echarts_chart"
  const ChartIcon = isECharts ? BarChart3 : GitBranch
  const chartLabel = isECharts ? "ECharts" : "Mermaid"
  const titleLabel = isComplete ? `Update ${chartLabel} Chart` : `Updating ${chartLabel} Chart...`

  return (
    <Tool key={toolPart.toolCallId} className="mt-4" defaultOpen={true}>
      <ToolHeader type={`tool-${toolType}`} state={toolPart.state} title={titleLabel} />
      <ToolContent className="space-y-4 px-4 py-4">
        {description && (
          <div className="space-y-1.5">
            <h4 className="font-medium text-muted-foreground text-[10px] uppercase tracking-wider">
              Changes
            </h4>
            <MessageResponse className="prose prose-sm dark:prose-invert text-xs leading-relaxed">
              {description}
            </MessageResponse>
          </div>
        )}

        {toolPart.state === "output-error" && toolPart.errorText && (
          <div className="space-y-1.5">
            <h4 className="font-medium text-destructive text-[10px] uppercase tracking-wider">
              Error
            </h4>
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
              {toolPart.errorText}
            </div>
          </div>
        )}

        {code && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
            <div className="flex items-center gap-2">
              <ChartIcon className="size-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <h4 className="font-medium text-muted-foreground text-[10px] uppercase tracking-wider">
                  {chartLabel} Chart
                </h4>
                <p className="text-xs text-muted-foreground">View the generated chart.</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => onSelectChartMessage(messageId)}
            >
              <Eye className="size-4" />
              View
            </Button>
          </div>
        )}
      </ToolContent>
    </Tool>
  )
}
