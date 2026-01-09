"use client"

import { exportSvgToPng } from "@/lib/utils/svg-export"
import { Button } from "@workspace/ui/components/button"
import { Check, Copy, Download } from "lucide-react"
import { useState } from "react"
import type { MermaidPlugin, MermaidPluginContext } from "./types"

function ExportControls({ ctx }: { ctx: MermaidPluginContext }) {
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ctx.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access denied or unavailable
    }
  }

  const handleExport = async () => {
    if (!ctx.svg) return
    setExporting(true)
    try {
      await exportSvgToPng(ctx.svg)
    } catch {
      // Export failed silently
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      className="absolute top-4 right-16 flex flex-row gap-1 p-1.5 bg-background/80 backdrop-blur-md rounded-xl border shadow-xl z-20"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="size-8 rounded-lg"
        title="Copy Mermaid Code"
      >
        {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleExport}
        className="size-8 rounded-lg"
        disabled={exporting || !ctx.svg}
        title="Export PNG"
      >
        <Download className="size-4" />
      </Button>
    </div>
  )
}

export function createExportPlugin(): MermaidPlugin {
  return {
    name: "export",
    renderControls: (ctx) => <ExportControls key="export-controls" ctx={ctx} />,
  }
}
