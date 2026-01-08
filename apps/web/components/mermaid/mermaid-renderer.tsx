"use client"

import { cn } from "@workspace/ui/lib/utils"
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function MermaidRenderer({ code, className, onSvgChange }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<{
    pointerId: number | null
    startX: number
    startY: number
    originX: number
    originY: number
  }>({ pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0 })

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

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = container.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top
      const direction = event.deltaY > 0 ? 0.9 : 1.1

      setTransform((prev) => {
        const nextScale = clamp(prev.scale * direction, 0.2, 4)
        if (nextScale === prev.scale) return prev
        const scaleRatio = nextScale / prev.scale
        const nextX = mouseX - (mouseX - prev.x) * scaleRatio
        const nextY = mouseY - (mouseY - prev.y) * scaleRatio
        return { x: nextX, y: nextY, scale: nextScale }
      })
    }

    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => container.removeEventListener("wheel", handleWheel)
  }, [])

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
        "relative h-full overflow-hidden p-4 select-none touch-none",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className
      )}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: transform.x,
          originY: transform.y,
        }
        setIsDragging(true)
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!isDragging || dragRef.current.pointerId !== event.pointerId) return
        const dx = event.clientX - dragRef.current.startX
        const dy = event.clientY - dragRef.current.startY
        setTransform((prev) => ({
          x: dragRef.current.originX + dx,
          y: dragRef.current.originY + dy,
          scale: prev.scale,
        }))
      }}
      onPointerUp={(event) => {
        if (dragRef.current.pointerId !== event.pointerId) return
        setIsDragging(false)
        dragRef.current.pointerId = null
        event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={(event) => {
        if (dragRef.current.pointerId !== event.pointerId) return
        setIsDragging(false)
        dragRef.current.pointerId = null
        event.currentTarget.releasePointerCapture(event.pointerId)
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
        }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid SVG output
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  )
}
