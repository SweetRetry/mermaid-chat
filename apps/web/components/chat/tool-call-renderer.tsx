"use client"

import { MermaidRenderer } from "@/components/mermaid/mermaid-renderer"
import type { UpdateChartToolUIPart } from "@/types/tool"
import { MessageResponse } from "@workspace/ui/ai-elements/message"
import { Tool, ToolContent, ToolHeader } from "@workspace/ui/ai-elements/tool"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Eye } from "lucide-react"

interface ToolCallRendererProps {
  toolPart: UpdateChartToolUIPart
}

export function ToolCallRenderer({ toolPart }: ToolCallRendererProps) {
  const description =
    toolPart.state === "output-available"
      ? toolPart.output?.description
      : toolPart.input?.description
  const code = toolPart.state === "output-available" ? toolPart.output?.code : toolPart.input?.code

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

        {code && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
            <div className="space-y-0.5">
              <h4 className="font-medium text-muted-foreground text-[10px] uppercase tracking-wider">
                Diagram
              </h4>
              <p className="text-xs text-muted-foreground">View the Mermaid diagram.</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Eye className="size-4" />
                  View
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl! h-[70vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Mermaid Diagram</DialogTitle>
                </DialogHeader>
                <div className="flex-1 rounded-lg border bg-muted/20 overflow-hidden">
                  <MermaidRenderer code={code} className="h-full" />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </ToolContent>
    </Tool>
  )
}
