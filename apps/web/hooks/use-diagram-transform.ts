"use client"

import { useGesture } from "@use-gesture/react"
import { type RefObject, useCallback, useState } from "react"

export const MIN_SCALE = 0.2
export const MAX_SCALE = 4
const FIT_VIEW_PADDING = 40

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

    // Get original SVG dimensions from viewBox or width/height attributes
    const viewBox = svg.viewBox.baseVal
    const svgWidth = viewBox.width || parseFloat(svg.getAttribute("width") || "0")
    const svgHeight = viewBox.height || parseFloat(svg.getAttribute("height") || "0")

    if (svgWidth === 0 || svgHeight === 0) return

    // Calculate scale to fit with padding
    const availableWidth = containerRect.width - FIT_VIEW_PADDING * 2
    const availableHeight = containerRect.height - FIT_VIEW_PADDING * 2

    const scaleX = availableWidth / svgWidth
    const scaleY = availableHeight / svgHeight
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_SCALE), MAX_SCALE)

    // Center the diagram (x: 0, y: 0 means centered due to transformOrigin: center)
    setTransform({ x: 0, y: 0, scale: newScale })
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
