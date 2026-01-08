"use client"

import { useGesture } from "@use-gesture/react"
import { type RefObject, useState } from "react"

export const MIN_SCALE = 0.2
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

  return {
    transform,
    zoomIn,
    zoomOut,
    reset,
    setTransform,
  }
}
