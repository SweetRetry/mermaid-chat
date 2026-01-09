"use client"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import mermaid from "mermaid"
import { type ReactNode, type RefObject, useEffect, useEffectEvent, useMemo, useRef, useState } from "react"

// ============================================================================
// Plugin System Types
// ============================================================================

export interface MermaidPluginContext {
  code: string
  svg: string
  containerRef: RefObject<HTMLDivElement | null>
  isUpdating: boolean
  isParsing: boolean
}

export interface MermaidPlugin {
  name: string
  /** Render overlay controls (e.g., zoom buttons, export) */
  renderControls?: (ctx: MermaidPluginContext) => ReactNode
  /** Wrap the SVG container (e.g., add pan/zoom transform) */
  wrapContainer?: (children: ReactNode, ctx: MermaidPluginContext) => ReactNode
  /** Container props to merge (e.g., event handlers, styles) */
  getContainerProps?: (ctx: MermaidPluginContext) => React.HTMLAttributes<HTMLDivElement>
  /** Called after SVG render */
  onRender?: (ctx: MermaidPluginContext) => void
}

// ============================================================================
// Mermaid Initialization
// ============================================================================

mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  fontFamily: "inherit",
})

// ============================================================================
// Core Renderer
// ============================================================================

interface MermaidRendererProps {
  code: string
  className?: string
  plugins?: MermaidPlugin[]
  onSvgChange?: (svg: string) => void
  isUpdating?: boolean
  /** Show loading indicator */
  showLoading?: boolean
  /** Show error state */
  showError?: boolean
  /** Callback when user clicks "Fix Error" button */
  onFixError?: (error: string) => void
}

export function MermaidRenderer({
  code,
  className,
  plugins = [],
  onSvgChange,
  isUpdating = false,
  showLoading = true,
  showError = true,
  onFixError,
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [lastValidSvg, setLastValidSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)

  // Non-reactive callback for SVG changes
  const handleSvgChange = useEffectEvent((newSvg: string) => {
    onSvgChange?.(newSvg)
  })

  // Render mermaid diagram
  useEffect(() => {
    if (!code.trim()) {
      setSvg("")
      setError(null)
      handleSvgChange("")
      return
    }

    let cancelled = false

    const renderDiagram = async () => {
      setIsParsing(true)
      try {
        const id = `mermaid-${Date.now()}`
        const { svg: renderedSvg } = await mermaid.render(id, code)
        if (cancelled) return
        const parser = new DOMParser()
        const doc = parser.parseFromString(renderedSvg, "image/svg+xml")
        // Add data attributes for node selection
        doc.querySelectorAll("g.node[id]").forEach((node) => {
          const nodeId = node.getAttribute("id")
          if (!nodeId) return
          node.querySelectorAll(".nodeLabel, foreignObject").forEach((el) => {
            el.setAttribute("data-node-id", nodeId)
          })
        })
        const serialized = new XMLSerializer().serializeToString(doc)
        setSvg(serialized)
        setLastValidSvg(serialized)
        setError(null)
        handleSvgChange(serialized)
      } catch (err) {
        if (cancelled) return
        if (!isUpdating) {
          setError(err instanceof Error ? err.message : "Failed to render diagram")
        }
        handleSvgChange("")
      } finally {
        if (!cancelled) {
          setIsParsing(false)
        }
      }
    }

    renderDiagram()

    return () => {
      cancelled = true
    }
  }, [code, isUpdating])

  // Plugin context
  const ctx: MermaidPluginContext = useMemo(
    () => ({
      code,
      svg: svg || lastValidSvg,
      containerRef,
      isUpdating,
      isParsing,
    }),
    [code, svg, lastValidSvg, isUpdating, isParsing]
  )

  // Merge container props from plugins (must be before any conditional returns)
  const mergedContainerProps = useMemo(() => {
    const classNames: (string | undefined)[] = []
    const styles: React.CSSProperties[] = []
    const otherProps: Record<string, unknown> = {}

    for (const plugin of plugins) {
      const pluginProps = plugin.getContainerProps?.(ctx)
      if (!pluginProps) continue

      const { className, style, ...rest } = pluginProps
      if (className) classNames.push(className)
      if (style) styles.push(style)
      Object.assign(otherProps, rest)
    }

    return {
      ...otherProps,
      className: cn(...classNames),
      style: Object.assign({}, ...styles),
    } as React.HTMLAttributes<HTMLDivElement>
  }, [plugins, ctx])

  // Notify plugins on render (must be before any conditional returns)
  useEffect(() => {
    if (svg) {
      plugins.forEach((plugin) => plugin.onRender?.(ctx))
    }
  }, [svg, plugins, ctx])

  // Early returns after all hooks
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

  // Core SVG container
  let svgContainer = (
    <div
      className={cn(
        "mermaid-container w-full h-full flex items-center justify-center p-4",
        (isUpdating || isParsing) &&
          "opacity-50 grayscale-[0.5] transition-[opacity,filter] duration-300"
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid SVG output
      dangerouslySetInnerHTML={{ __html: svg || lastValidSvg }}
    />
  )

  // Apply plugin wrappers
  for (const plugin of plugins) {
    if (plugin.wrapContainer) {
      svgContainer = <>{plugin.wrapContainer(svgContainer, ctx)}</>
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full overflow-hidden bg-muted/5", className)}
      {...mergedContainerProps}
    >
      {svgContainer}

      {/* Loading indicator */}
      {showLoading && (isUpdating || isParsing) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/20 backdrop-blur-xs pointer-events-none animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-background/90 rounded-full border shadow-sm border-border/50">
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground/80">
              {isUpdating ? "Generating" : "Rendering"}
            </span>
          </div>
        </div>
      )}

      {/* Plugin controls */}
      {plugins.map((plugin) => plugin.renderControls?.(ctx))}
    </div>
  )
}

// ============================================================================
// Re-export plugins
// ============================================================================

export * from "./plugins"
