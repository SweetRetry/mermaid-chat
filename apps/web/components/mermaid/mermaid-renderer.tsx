"use client"

import { useDiagramTransform } from "@/hooks/use-diagram-transform"
import { useNodeSelection } from "@/hooks/use-node-selection"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react"
import mermaid from "mermaid"
import { useEffect, useRef, useState } from "react"

interface MermaidRendererProps {
  code: string
  className?: string
  onSvgChange?: (svg: string) => void
  onNodeSelect?: (label: string) => void
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
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const { transform, zoomIn, zoomOut, reset, setTransform } = useDiagramTransform(containerRef)
  const { handleNodeSelect } = useNodeSelection({ containerRef, svg, onNodeSelect })

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

  if (!code.trim() || !svg) {
    return null
  }

  if (error) {
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
      <div
        className="mermaid-container w-full h-full flex items-center justify-center p-8"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "center center",
        }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid SVG output
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <div
        className="absolute bottom-4 right-4 flex flex-col gap-1.5 p-1.5 bg-background/80 backdrop-blur-md rounded-xl border shadow-xl z-10 scale-90 sm:scale-100"
        onPointerDown={(e) => e.stopPropagation()}
      >
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

      <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm rounded-full border text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        <Maximize2 className="size-3" />
        {(transform.scale * 100).toFixed(0)}%
      </div>
    </div>
  )
}
