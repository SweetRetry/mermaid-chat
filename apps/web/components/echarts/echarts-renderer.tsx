"use client"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import * as echarts from "echarts"
import { Camera } from "lucide-react"
import { memo, useCallback, useDeferredValue, useEffect, useRef, useState } from "react"

interface EChartsRendererProps {
  code: string
  className?: string
  isUpdating?: boolean
  showLoading?: boolean
  showError?: boolean
  onFixError?: (error: string) => void
  /** Callback when user exports chart as image */
  onExportImage?: (dataUrl: string) => void
}

/**
 * Parse ECharts JSON configuration from code string.
 * Handles both raw JSON and markdown-wrapped JSON.
 */
function parseEChartsConfig(code: string): echarts.EChartsOption | null {
  if (!code.trim()) return null

  // Strip markdown code fences if present
  let cleanCode = code.trim()
  const jsonMatch = cleanCode.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i)
  if (jsonMatch?.[1]) {
    cleanCode = jsonMatch[1].trim()
  }

  try {
    return JSON.parse(cleanCode) as echarts.EChartsOption
  } catch {
    return null
  }
}

export const EChartsRenderer = memo(function EChartsRenderer({
  code,
  className,
  isUpdating = false,
  showLoading = true,
  showError = true,
  onFixError,
  onExportImage,
}: EChartsRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)

  // Defer code updates during rapid changes (e.g., AI streaming)
  const deferredCode = useDeferredValue(code)
  const isStale = deferredCode !== code

  // Initialize and update chart
  useEffect(() => {
    if (!containerRef.current) return

    setIsParsing(true)
    const config = parseEChartsConfig(deferredCode)

    if (!config) {
      if (deferredCode.trim() && !isUpdating) {
        setError("Invalid ECharts configuration: unable to parse JSON")
      }
      setIsParsing(false)
      return
    }

    try {
      // Initialize chart if not exists
      // Use canvas renderer for better image export support
      if (!chartRef.current) {
        chartRef.current = echarts.init(containerRef.current, undefined, {
          renderer: "canvas",
        })
      }

      // Set options with merge for smoother updates
      chartRef.current.setOption(config, { notMerge: true })
      setError(null)
    } catch (err) {
      if (!isUpdating) {
        setError(err instanceof Error ? err.message : "Failed to render chart")
      }
    } finally {
      setIsParsing(false)
    }
  }, [deferredCode, isUpdating])

  // Handle resize
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const resizeObserver = new ResizeObserver(() => {
      chart.resize()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  // Export chart as image
  const handleExportImage = useCallback(() => {
    const chart = chartRef.current
    if (!chart || !onExportImage) return

    const dataUrl = chart.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: "#fff",
    })
    onExportImage(dataUrl)
  }, [onExportImage])

  if (!code.trim()) {
    return null
  }

  if (error && showError) {
    return (
      <div className={cn("flex items-center justify-center h-full p-4", className)}>
        <div className="flex flex-col items-center text-center space-y-4 max-w-md p-6 rounded-xl bg-destructive/5 border border-destructive/10">
          <div className="space-y-1">
            <p className="font-semibold text-destructive">Render Error</p>
            <p className="text-xs text-muted-foreground line-clamp-3">{error}</p>
          </div>
          {onFixError && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onFixError(error)}
              className="rounded-full px-6"
            >
              Fix with AI
            </Button>
          )}
        </div>
      </div>
    )
  }

  const isLoading = isUpdating || isParsing || isStale

  return (
    <div className={cn("relative h-full overflow-hidden bg-muted/5", className)}>
      <div
        ref={containerRef}
        className={cn(
          "w-full h-full",
          isLoading && "opacity-50 grayscale-[0.5] transition-[opacity,filter] duration-300"
        )}
      />

      {/* Loading indicator */}
      {showLoading && isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/20 backdrop-blur-xs pointer-events-none animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-background/90 rounded-full border shadow-sm border-border/50">
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground/80">
              {isUpdating ? "Generating" : "Rendering"}
            </span>
          </div>
        </div>
      )}

      {/* Export button */}
      {onExportImage && !isLoading && !error && (
        <div className="absolute bottom-4 right-4 z-20">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 shadow-md"
            onClick={handleExportImage}
            title="Add chart image to chat"
          >
            <Camera className="size-4" />
            <span className="text-xs">Add to Chat</span>
          </Button>
        </div>
      )}
    </div>
  )
})
