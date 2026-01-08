"use client"

import { exportSvgToPng } from "@/lib/utils/svg-export"
import { Button } from "@workspace/ui/components/button"
import { Check, Code, Copy, Download, Eye } from "lucide-react"
import { useState } from "react"

interface MermaidToolbarProps {
  code: string
  svgContent: string
  showCode: boolean
  onToggleView: () => void
}

export function MermaidToolbar({ code, svgContent, showCode, onToggleView }: MermaidToolbarProps) {
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = async () => {
    if (!svgContent) return
    setExporting(true)
    try {
      await exportSvgToPng(svgContent)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex items-center justify-between px-4 h-12 border-b bg-muted/20 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-primary/60 animate-pulse" />
        <span className="text-sm font-semibold tracking-tight">Diagram Preview</span>
      </div>
      <div className="flex items-center gap-1.5 p-1 bg-background/50 rounded-lg border">
        <Button
          variant={showCode ? "secondary" : "ghost"}
          size="sm"
          onClick={onToggleView}
          className="h-8 px-3 transition-all"
        >
          {showCode ? <Eye className="h-4 w-4 mr-2" /> : <Code className="h-4 w-4 mr-2" />}
          <span className="text-xs font-medium">{showCode ? "Preview" : "View Code"}</span>
        </Button>
        <div className="w-px h-4 bg-border mx-0.5" />
        {code && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-8 w-8 transition-all hover:bg-primary/10 hover:text-primary"
            title="Copy Mermaid Code"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        )}
        {svgContent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="h-8 px-3 transition-all hover:bg-primary/10 hover:text-primary"
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="text-xs font-medium">Export PNG</span>
          </Button>
        )}
      </div>
    </div>
  )
}
