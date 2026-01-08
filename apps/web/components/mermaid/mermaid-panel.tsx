"use client"

import { useChatStore } from "@/lib/store/chat-store"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { MermaidEmptyState } from "./mermaid-empty-state"
import { MermaidRenderer } from "./mermaid-renderer"

interface MermaidPanelProps {
  className?: string
}

export function MermaidPanel({ className }: MermaidPanelProps) {
  const code = useChatStore((state) => state.mermaidCode)
  const appendInputText = useChatStore((state) => state.appendInputText)
  const isUpdating = useChatStore((state) => state.isMermaidUpdating)
  const isLoadingConversation = useChatStore((state) => state.isLoadingConversation)

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
      {code ? (
        <MermaidRenderer
          code={code}
          className="h-full"
          onNodeSelect={appendInputText}
          isUpdating={isUpdating}
        />
      ) : (
        <MermaidEmptyState />
      )}
    </div>
  )
}
