"use client"

import type { MermaidPlugin, MermaidPluginContext } from "../mermaid-renderer"
import { MAX_SCALE, MIN_SCALE } from "@/hooks/use-diagram-transform"
import { useGesture } from "@use-gesture/react"
import { Button } from "@workspace/ui/components/button"
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react"
import { type ReactNode, useState } from "react"

interface TransformPluginOptions {
  showIndicator?: boolean
  showControls?: boolean
}

interface Transform {
  x: number
  y: number
  scale: number
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
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 })

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
      target: ctx.containerRef,
      drag: { from: () => [transform.x, transform.y] },
      pinch: { scaleBounds: { min: MIN_SCALE, max: MAX_SCALE }, from: () => [transform.scale, 0] },
      wheel: { eventOptions: { passive: false } },
    }
  )

  const zoomIn = () => setTransform((prev) => ({ ...prev, scale: Math.min(prev.scale + 0.2, MAX_SCALE) }))
  const zoomOut = () => setTransform((prev) => ({ ...prev, scale: Math.max(prev.scale - 0.2, MIN_SCALE) }))
  const reset = () => setTransform({ x: 0, y: 0, scale: 1 })

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
          <Button variant="secondary" size="icon" className="size-8 rounded-lg" onClick={zoomIn} title="Zoom In">
            <Plus className="size-4" />
          </Button>
          <Button variant="secondary" size="icon" className="size-8 rounded-lg" onClick={reset} title="Reset">
            <RotateCcw className="size-3.5" />
          </Button>
          <Button variant="secondary" size="icon" className="size-8 rounded-lg" onClick={zoomOut} title="Zoom Out">
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
