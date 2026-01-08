"use client"

import type { UpdateChartToolUIPart } from "@/types/tool"
import { MessageResponse } from "@workspace/ui/ai-elements/message"
import { Tool, ToolContent, ToolHeader } from "@workspace/ui/ai-elements/tool"

interface ToolCallRendererProps {
  toolPart: UpdateChartToolUIPart
}

export function ToolCallRenderer({ toolPart }: ToolCallRendererProps) {
  const description =
    toolPart.state === "output-available"
      ? toolPart.output?.description
      : toolPart.input?.description

  return (
    <Tool key={toolPart.toolCallId} className="mt-4" defaultOpen={true}>
      <ToolHeader type="tool-update_chart" state={toolPart.state} title="Update Diagram" />
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
      </ToolContent>
    </Tool>
  )
}
