"use client"

import { EXAMPLES } from "@/lib/constants/examples"
import { Code } from "lucide-react"

interface MermaidEmptyStateProps {
  onSelectExample: (prompt: string) => void
}

export function MermaidEmptyState({ onSelectExample }: MermaidEmptyStateProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center border-2 border-primary/10 border-dashed animate-in fade-in zoom-in duration-500">
        <Code className="size-10 text-primary/40" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-lg font-semibold tracking-tight">No diagram generated</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Describe a process or system in the chat to see it visualized here with Mermaid.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-4">
        {EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => onSelectExample(example.prompt)}
            className="p-3 rounded-xl border bg-muted/5 text-xs text-muted-foreground hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all text-left group"
          >
            <div className="font-semibold mb-1 group-hover:text-primary transition-colors text-foreground">
              {example.label}
            </div>
            <div className="opacity-60 line-clamp-1">Click to generate...</div>
          </button>
        ))}
      </div>
    </div>
  )
}
