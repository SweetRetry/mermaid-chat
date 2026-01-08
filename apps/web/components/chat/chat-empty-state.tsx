"use client"

import { EXAMPLES } from "@/lib/constants/examples"
import { Button } from "@workspace/ui/components/button"
import { MessageSquare } from "lucide-react"

interface ChatEmptyStateProps {
  onSelectExample: (prompt: string) => void
}

export function ChatEmptyState({ onSelectExample }: ChatEmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 animate-in fade-in duration-500">
      <div className="space-y-4 opacity-60">
        <div className="size-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-2 mx-auto">
          <MessageSquare className="size-8 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight text-foreground">Ready to visualize?</h3>
          <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
            Type your prompt below or pick an example to get started.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full max-w-[280px]">
        {EXAMPLES.map((example) => (
          <Button
            key={example.label}
            variant="link"
            onClick={() => onSelectExample(example.prompt)}
            className="p-3.5 rounded-2xl border border-muted/20 bg-background/40 backdrop-blur-sm shadow-sm text-xs text-muted-foreground hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all text-left group flex flex-col gap-1"
          >
            <div className="font-bold tracking-tight group-hover:text-primary transition-colors text-foreground">
              {example.label}
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}
