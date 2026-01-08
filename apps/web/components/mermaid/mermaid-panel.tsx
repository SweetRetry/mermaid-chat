"use client"

import { useChatStore } from "@/lib/store/chat-store"
import { cn } from "@workspace/ui/lib/utils"
import { useState } from "react"
import { MermaidEmptyState } from "./mermaid-empty-state"
import { MermaidRenderer } from "./mermaid-renderer"
import { MermaidToolbar } from "./mermaid-toolbar"

interface MermaidPanelProps {
  className?: string
}

export function MermaidPanel({ className }: MermaidPanelProps) {
  const code = useChatStore((state) => state.mermaidCode)
  const handleSelectExample = useChatStore((state) => state.handleSelectExample)
  const appendInputText = useChatStore((state) => state.appendInputText)
  const [showCode, setShowCode] = useState(false)
  const [svgContent, setSvgContent] = useState("")

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <MermaidToolbar
        code={code}
        svgContent={svgContent}
        showCode={showCode}
        onToggleView={() => setShowCode(!showCode)}
      />

      <div className="flex-1 overflow-hidden relative">
        {showCode ? (
          <div className="h-full overflow-auto p-6 bg-muted/5 font-mono text-[13px] leading-relaxed">
            <pre className="p-4 rounded-xl border bg-background/50 shadow-sm border-dashed">
              <code>{code || "// No diagram code yet"}</code>
            </pre>
          </div>
        ) : code ? (
          <MermaidRenderer
            code={code}
            className="h-full"
            onSvgChange={setSvgContent}
            onNodeSelect={appendInputText}
          />
        ) : (
          <MermaidEmptyState onSelectExample={handleSelectExample} />
        )}
      </div>
    </div>
  )
}
