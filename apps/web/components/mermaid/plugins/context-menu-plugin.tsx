"use client"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import { Check, Copy, Download, Loader2 } from "lucide-react"
import { type ReactNode, useCallback, useState } from "react"
import { exportSvgToPng } from "@/lib/utils/svg-export"
import type { MermaidPlugin, MermaidPluginContext } from "./types"

function ContextMenuWrapper({ children, ctx }: { children: ReactNode; ctx: MermaidPluginContext }) {
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleCopyCode = useCallback(async () => {
    await navigator.clipboard.writeText(ctx.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [ctx.code])

  const handleExportPng = useCallback(async () => {
    if (!ctx.svg || exporting) return
    setExporting(true)
    try {
      await exportSvgToPng(ctx.svg)
    } finally {
      setExporting(false)
    }
  }, [ctx.svg, exporting])

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCopyCode}>
          {copied ? (
            <Check className="size-4 mr-2 text-primary" />
          ) : (
            <Copy className="size-4 mr-2" />
          )}
          {copied ? "Copied!" : "Copy Mermaid Code"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleExportPng} disabled={!ctx.svg || exporting}>
          {exporting ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Download className="size-4 mr-2" />
          )}
          Export as PNG
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function createContextMenuPlugin(): MermaidPlugin {
  return {
    name: "context-menu",
    wrapContainer: (children, ctx) => <ContextMenuWrapper ctx={ctx}>{children}</ContextMenuWrapper>,
  }
}
