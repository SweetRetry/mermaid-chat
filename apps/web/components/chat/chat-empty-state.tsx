"use client"

import { MessageSquare } from "lucide-react"

export function ChatEmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 animate-in fade-in duration-500">
      <div className="space-y-4 opacity-60">
        <div className="size-16 rounded-3xl bg-muted flex items-center justify-center mb-2 mx-auto">
          <MessageSquare className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight text-foreground">Ready to visualize?</h3>
          <p className="text-xs text-muted-foreground max-w-60 mx-auto">
            Type your prompt below to generate Mermaid diagrams.
          </p>
        </div>
      </div>
    </div>
  )
}
