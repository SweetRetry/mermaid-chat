"use client"

import { useDiagramTransform } from "@/hooks/use-diagram-transform"
import { useNodeSelection } from "@/hooks/use-node-selection"
import { exportSvgToPng } from "@/lib/utils/svg-export"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { Check, Code, Copy, Download, Maximize2, Minus, Plus, RotateCcw } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import mermaid from "mermaid"
import { useEffect, useRef, useState } from "react"

interface MermaidRendererProps {
  code: string
  className?: string
  onSvgChange?: (svg: string) => void
  onNodeSelect?: (label: string) => void
  minimal?: boolean
}

mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  fontFamily: "inherit",
})

export function MermaidRenderer({
  code,
  className,
  onSvgChange,
  onNodeSelect,
  minimal = false,
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const { transform, zoomIn, zoomOut, reset, setTransform } = useDiagramTransform(containerRef)
  const { handleNodeSelect } = useNodeSelection({ containerRef, svg, onNodeSelect })

  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = async () => {
    if (!svg) return
    setExporting(true)
    try {
      await exportSvgToPng(svg)
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    if (!code.trim()) {
      setSvg("")
      setError(null)
      onSvgChange?.("")
      return
    }

    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Date.now()}`
        const { svg: renderedSvg } = await mermaid.render(id, code)
        const parser = new DOMParser()
        const doc = parser.parseFromString(renderedSvg, "image/svg+xml")
        doc.querySelectorAll("g.node[id]").forEach((node) => {
          const nodeId = node.getAttribute("id")
          if (!nodeId) return
          node.querySelectorAll(".nodeLabel, foreignObject").forEach((el) => {
            el.setAttribute("data-node-id", nodeId)
          })
        })
        const serialized = new XMLSerializer().serializeToString(doc)
        setSvg(serialized)
        setError(null)
        setTransform({ x: 0, y: 0, scale: 1 })
        onSvgChange?.(serialized)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to render diagram")
        setSvg("")
        onSvgChange?.("")
      }
    }

    renderDiagram()
  }, [code, onSvgChange, setTransform])

  if (!code.trim()) {
    return null
  }

  if (error && !minimal) {
    return (
      <div className={cn("flex items-center justify-center h-full p-4", className)}>
        <div className="text-destructive text-sm bg-destructive/10 p-4 rounded-md max-w-md">
          <p className="font-medium mb-1">Render Error</p>
          <p className="text-xs opacity-80">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full overflow-hidden select-none touch-none bg-muted/5 cursor-grab active:cursor-grabbing",
        className
      )}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        handleNodeSelect(event.target, event as unknown as Event)
      }}
    >
      {!minimal && (
        <div
          className="mermaid-container w-full h-full flex items-center justify-center p-8"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "center center",
          }}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid SVG output
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      <div
        className="absolute bottom-4 right-4 flex flex-col gap-1.5 p-1.5 bg-background/80 backdrop-blur-md rounded-xl border shadow-xl z-10 scale-90 sm:scale-100"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 rounded-lg" title="View Code">
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
                  {copied ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
                <pre className="whitespace-pre-wrap break-all">
                  <code>{code}</code>
                </pre>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary"
            title="Copy Mermaid Code"
          >
            {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExport}
            className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary"
            disabled={exporting || !svg}
            title="Export PNG"
          >
            <Download className="size-4" />
          </Button>
        </div>

        {!minimal && (
          <>
            <div className="h-px bg-border mx-1 my-0.5" />

            <div className="flex flex-col gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="size-8 rounded-lg"
                onClick={zoomIn}
                title="Zoom In"
              >
                <Plus className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="size-8 rounded-lg"
                onClick={reset}
                title="Reset"
              >
                <RotateCcw className="size-3.5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="size-8 rounded-lg"
                onClick={zoomOut}
                title="Zoom Out"
              >
                <Minus className="size-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {!minimal && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm rounded-full border text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          <Maximize2 className="size-3" />
          {(transform.scale * 100).toFixed(0)}%
        </div>
      )}
    </div>
  )
}
