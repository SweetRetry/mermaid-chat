"use client"

import type { MermaidPlugin, MermaidPluginContext } from "../mermaid-renderer"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Check, Code, Copy } from "lucide-react"
import { useState } from "react"

function CodeViewControls({ ctx }: { ctx: MermaidPluginContext }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(ctx.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 size-8 rounded-lg bg-background/80 backdrop-blur-md border shadow-sm z-20"
          title="View Code"
        >
          <Code className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl! max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="size-5" />
            Mermaid Source Code
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/50 rounded-lg p-4 font-mono text-[13px] leading-relaxed border group relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="absolute top-2 right-2 size-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur"
            title="Copy Code"
          >
            {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
          </Button>
          <pre className="whitespace-pre-wrap break-all">
            <code>{ctx.code}</code>
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function createCodeViewPlugin(): MermaidPlugin {
  return {
    name: "code-view",
    renderControls: (ctx) => <CodeViewControls key="code-view-controls" ctx={ctx} />,
  }
}
