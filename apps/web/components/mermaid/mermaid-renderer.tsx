"use client"

import { useGesture } from "@use-gesture/react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react"
import mermaid from "mermaid"
import { useEffect, useRef, useState } from "react"

interface MermaidRendererProps {
  code: string
  className?: string
  onSvgChange?: (svg: string) => void
}

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "inherit",
})

const MIN_SCALE = 0.2
const MAX_SCALE = 4

export function MermaidRenderer({ code, className, onSvgChange }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })

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
        setSvg(renderedSvg)
        setError(null)
        setTransform({ x: 0, y: 0, scale: 1 })
        onSvgChange?.(renderedSvg)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to render diagram")
        setSvg("")
        onSvgChange?.("")
      }
    }

    renderDiagram()
  }, [code, onSvgChange])

  useGesture(
    {
      onDrag: ({ offset: [x, y] }) => {
        setTransform((prev) => ({ ...prev, x, y }))
      },
      onPinch: ({ offset: [scale] }) => {
        setTransform((prev) => ({ ...prev, scale }))
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault()
        setTransform((prev) => ({
          ...prev,
          scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale - dy * 0.001)),
        }))
      },
    },
    {
      target: containerRef,
      drag: {
        from: () => [transform.x, transform.y],
      },
      pinch: {
        scaleBounds: { min: MIN_SCALE, max: MAX_SCALE },
        from: () => [transform.scale, 0],
      },
      wheel: {
        eventOptions: { passive: false },
      },
    }
  )

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
    >
      {/* Diagram Layer */}
      <div
        className="w-full h-full flex items-center justify-center p-8"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "center center",
        }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid SVG output
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {/* Floating Controls */}
      <div
        className="absolute bottom-4 right-4 flex flex-col gap-1.5 p-1.5 bg-background/80 backdrop-blur-md rounded-xl border shadow-xl z-10 scale-90 sm:scale-100"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="secondary"
          size="icon"
          className="size-8 rounded-lg"
          onClick={() =>
            setTransform((p) => ({ ...p, scale: Math.min(p.scale + 0.2, MAX_SCALE) }))
          }
          title="Zoom In"
        >
          <Plus className="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="size-8 rounded-lg"
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          title="Reset"
        >
          <RotateCcw className="size-3.5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="size-8 rounded-lg"
          onClick={() =>
            setTransform((p) => ({ ...p, scale: Math.max(p.scale - 0.2, MIN_SCALE) }))
          }
          title="Zoom Out"
        >
          <Minus className="size-4" />
        </Button>
      </div>

      {/* Scale Indicator */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm rounded-full border text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        <Maximize2 className="size-3" />
        {(transform.scale * 100).toFixed(0)}%
      </div>
    </div>
  )
}
