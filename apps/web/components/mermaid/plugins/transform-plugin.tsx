"use client"

import { Button } from "@workspace/ui/components/button"
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react"
import { type ReactNode, useEffect, useRef } from "react"
import { useDiagramTransform } from "@/hooks/use-diagram-transform"
import type { MermaidPlugin, MermaidPluginContext } from "./types"

interface TransformPluginOptions {
  showIndicator?: boolean
  showControls?: boolean
}

function TransformContainer({
  children,
  ctx,
  showControls,
  showIndicator,
}: {
  children: ReactNode
  ctx: MermaidPluginContext
  showControls: boolean
  showIndicator: boolean
}) {
  const { transform, zoomIn, zoomOut, reset, fitView } = useDiagramTransform(ctx.containerRef)
  const prevSvgRef = useRef<string>("")

  // Auto fitView when SVG changes
  useEffect(() => {
    if (ctx.svg && ctx.svg !== prevSvgRef.current && !ctx.isParsing) {
      prevSvgRef.current = ctx.svg
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        fitView()
      })
    }
  }, [ctx.svg, ctx.isParsing, fitView])

  return (
    <>
      <div
        className="w-full h-full"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>

      {showControls && (
        <div
          className="absolute bottom-4 right-4 flex flex-col gap-1 p-1.5 bg-background/80 backdrop-blur-md rounded-xl border shadow-xl z-20"
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
      )}

      {showIndicator && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm rounded-full border text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          <Maximize2 className="size-3" />
          {(transform.scale * 100).toFixed(0)}%
        </div>
      )}
    </>
  )
}

export function createTransformPlugin(options: TransformPluginOptions = {}): MermaidPlugin {
  const { showIndicator = true, showControls = true } = options

  return {
    name: "transform",
    getContainerProps: () => ({
      className: "select-none touch-none cursor-grab active:cursor-grabbing",
    }),
    wrapContainer: (children, ctx) => (
      <TransformContainer ctx={ctx} showControls={showControls} showIndicator={showIndicator}>
        {children}
      </TransformContainer>
    ),
  }
}
