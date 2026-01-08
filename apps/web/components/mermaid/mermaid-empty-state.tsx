"use client"
import { Code } from "lucide-react"

export function MermaidEmptyState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center border-2 border-primary/10 border-dashed animate-in fade-in zoom-in duration-500">
        <Code className="size-10 text-primary/40" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-b from-foreground to-foreground/50">
          No diagram generated
        </h3>
        <p className="text-sm text-muted-foreground/60 leading-relaxed font-medium">
          Describe a process or system in the chat to see it visualized here with Mermaid.
        </p>
      </div>
    </div>
  )
}
