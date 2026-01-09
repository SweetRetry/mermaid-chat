"use client"

export function MermaidEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-xl font-bold tracking-tight text-foreground">No diagram generated</h3>
        <p className="text-sm text-muted-foreground/60 leading-relaxed font-medium">
          Describe a process or system in the chat to see it visualized here with Mermaid.
        </p>
      </div>
    </div>
  )
}
