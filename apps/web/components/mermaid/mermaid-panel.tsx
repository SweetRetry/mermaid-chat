"use client"

import { useChatStore } from "@/lib/store/chat-store"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { useState } from "react"
import { MermaidEmptyState } from "./mermaid-empty-state"
import { MermaidRenderer } from "./mermaid-renderer"

interface MermaidPanelProps {
  className?: string
}

export function MermaidPanel({ className }: MermaidPanelProps) {
  const code = useChatStore((state) => state.mermaidCode)
  const appendInputText = useChatStore((state) => state.appendInputText)
  const isLoadingConversation = useChatStore((state) => state.isLoadingConversation)
  const [showCode, setShowCode] = useState(false)

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
      <div className="flex-1 overflow-hidden relative">
        {showCode ? (
          <div className="h-full overflow-auto p-6 bg-muted/5 font-mono text-[13px] leading-relaxed">
            <pre className="p-4 rounded-xl border bg-background/50 shadow-sm border-dashed">
              <code>{code || "// No diagram code yet"}</code>
            </pre>
            <div className="absolute bottom-4 right-4 z-10 w-12 h-20">
              <MermaidRenderer
                code={code}
                showCode={showCode}
                onToggleView={() => setShowCode(!showCode)}
                minimal={true}
              />
            </div>
          </div>
        ) : code ? (
          <MermaidRenderer
            code={code}
            className="h-full"
            showCode={showCode}
            onToggleView={() => setShowCode(!showCode)}
            onNodeSelect={appendInputText}
          />
        ) : (
          <MermaidEmptyState />
        )}
      </div>
    </div>
  )
}
