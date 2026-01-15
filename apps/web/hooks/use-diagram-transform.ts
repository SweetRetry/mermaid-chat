"use client"

import { useGesture } from "@use-gesture/react"
import { type RefObject, useCallback, useState } from "react"

export const MIN_SCALE = 1
export const MAX_SCALE = 4

export interface Transform {
  x: number
  y: number
  scale: number
}

export interface UseDiagramTransformReturn {
  transform: Transform
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  fitView: () => void
  setTransform: React.Dispatch<React.SetStateAction<Transform>>
}

export function useDiagramTransform(
  containerRef: RefObject<HTMLDivElement | null>
): UseDiagramTransformReturn {
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

  const zoomIn = () => {
    setTransform((prev) => ({ ...prev, scale: Math.min(prev.scale + 0.2, MAX_SCALE) }))
  }

  const zoomOut = () => {
    setTransform((prev) => ({ ...prev, scale: Math.max(prev.scale - 0.2, MIN_SCALE) }))
  }

  const reset = () => {
    setTransform({ x: 0, y: 0, scale: 1 })
  }

  const fitView = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const svg = container.querySelector("svg")
    if (!svg) return

    const containerRect = container.getBoundingClientRect()

    // Helper to get dimensions from viewBox
    const getViewBox = (element: SVGSVGElement) => {
      const viewBox = element.viewBox.baseVal
      return {
        x: viewBox.x,
        y: viewBox.y,
        width: viewBox.width,
        height: viewBox.height,
      }
    }

    // 1. DETERMINE CONTENT BOUNDS
    let x = 0
    let y = 0
    let width = 0
    let height = 0
    let usedBBox = false

    try {
      const bBox = svg.getBBox()
      x = bBox.x
      y = bBox.y
      width = bBox.width
      height = bBox.height

      if (width > 0 && height > 0) {
        usedBBox = true
      }
    } catch (e) {
      // Fallback
    }

    if (!usedBBox) {
      const vb = getViewBox(svg)
      x = vb.x
      y = vb.y
      width = vb.width || Number.parseFloat(svg.getAttribute("width") || "0")
      height = vb.height || Number.parseFloat(svg.getAttribute("height") || "0")
    }

    if (width === 0 || height === 0) return

    // 2. APPLY BOUNDS TO VIEWBOX
    svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`)

    // 3. SET INTRINSIC SIZE & RESET CSS
    // Remove "100%" CSS styles that force top-alignment or double-scaling
    svg.style.width = ""
    svg.style.height = ""
    svg.style.maxWidth = "none"

    // Set explicit pixel dimensions so the SVG element takes up accurate space.
    // The parent Flexbox (align-items: center) will then center this element perfectly.
    svg.setAttribute("width", `${width}`)
    svg.setAttribute("height", `${height}`)

    // Remove preserveAspectRatio to avoid conflicting alignment logic
    svg.removeAttribute("preserveAspectRatio")

    // 4. CALCULATE SCALE
    const padding = 40
    const availableWidth = containerRect.width - padding * 2
    const availableHeight = containerRect.height - padding * 2

    if (availableWidth <= 0 || availableHeight <= 0) return

    // 5. CENTER TRANSFORM
    setTransform({ x: 0, y: 0, scale: 2 })
  }, [containerRef])

  return {
    transform,
    zoomIn,
    zoomOut,
    reset,
    fitView,
    setTransform,
  }
}
