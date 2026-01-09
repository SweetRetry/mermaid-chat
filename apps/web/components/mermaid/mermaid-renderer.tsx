"use client"

import { cn } from "@workspace/ui/lib/utils"
import mermaid from "mermaid"
import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react"

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
}

export function MermaidRenderer({
  code,
  className,
  plugins = [],
  onSvgChange,
  isUpdating = false,
  showLoading = true,
  showError = true,
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [lastValidSvg, setLastValidSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)

  // Render mermaid diagram
  useEffect(() => {
    if (!code.trim()) {
      setSvg("")
      setError(null)
      onSvgChange?.("")
      return
    }

    const renderDiagram = async () => {
      setIsParsing(true)
      try {
        const id = `mermaid-${Date.now()}`
        const { svg: renderedSvg } = await mermaid.render(id, code)
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
        onSvgChange?.(serialized)
      } catch (err) {
        if (!isUpdating) {
          setError(err instanceof Error ? err.message : "Failed to render diagram")
        }
        onSvgChange?.("")
      } finally {
        setIsParsing(false)
      }
    }

    renderDiagram()
  }, [code, onSvgChange, isUpdating])

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
        <div className="text-destructive text-sm bg-destructive/10 p-4 rounded-md max-w-md">
          <p className="font-medium mb-1">Render Error</p>
          <p className="text-xs opacity-80">{error}</p>
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
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/5 backdrop-blur-[1px] pointer-events-none animate-in fade-in duration-300">
          <div className="flex items-center gap-3 px-4 py-2 bg-background/80 backdrop-blur-md rounded-full border shadow-sm scale-90">
            <div className="size-3 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              {isUpdating ? "AI is generating..." : "Rendering..."}
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
