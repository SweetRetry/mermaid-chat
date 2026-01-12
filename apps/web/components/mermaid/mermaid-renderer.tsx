"use client"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import mermaid from "mermaid"
import {
  memo,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import type { MermaidPlugin, MermaidPluginContext } from "./plugins/types"

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
// SVG Processing Utility
// ============================================================================

/**
 * Process rendered SVG to add data attributes for node selection.
 * Extracted for clarity and potential future caching.
 */
function processSvgForNodeSelection(svgString: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, "image/svg+xml")

  const nodes = doc.querySelectorAll("g.node[id]")
  for (const node of nodes) {
    const nodeId = node.getAttribute("id")
    if (!nodeId) continue
    const elements = node.querySelectorAll(".nodeLabel, foreignObject")
    for (const el of elements) {
      el.setAttribute("data-node-id", nodeId)
    }
  }

  return new XMLSerializer().serializeToString(doc)
}

/**
 * Get or create a persistent hidden container for mermaid rendering.
 * This prevents "Cannot read properties of null" errors when components unmount
 * during async mermaid.render() operations.
 */
function getMermaidRenderContainer(): HTMLDivElement {
  const containerId = "__mermaid_render_container__"
  let container = document.getElementById(containerId) as HTMLDivElement | null
  if (!container) {
    container = document.createElement("div")
    container.id = containerId
    container.style.cssText =
      "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;"
    document.body.appendChild(container)
  }
  return container
}

/**
 * Minimal pre-process to clean up basic wrapper artifacts.
 * Structural integrity is now managed by the LLM via strict prompt rules.
 */
function preprocessMermaidCode(code: string): string {
  if (!code) return ""
  return code.trim().replace(/^```(?:mermaid)?\s*\n?|```$/gi, "")
}

/**
 * Clean up mermaid temporary render elements from DOM
 */
function cleanupMermaidElement(id: string): void {
  // Use requestAnimationFrame to delay cleanup, allowing mermaid to finish
  requestAnimationFrame(() => {
    const element = document.getElementById(id)
    element?.remove()
  })
}

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
  /** Conversation ID for document operations */
  conversationId?: string
  /** Current document content */
  documentContent?: string | null
  /** Callback when document changes */
  onDocumentChange?: (document: string | null) => void
}

export const MermaidRenderer = memo(function MermaidRenderer({
  code,
  className,
  plugins = [],
  onSvgChange,
  isUpdating = false,
  showLoading = true,
  showError = true,
  onFixError,
  conversationId,
  documentContent,
  onDocumentChange,
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceId = useId()
  const [svg, setSvg] = useState<string>("")
  const [lastValidSvg, setLastValidSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)

  // Defer code updates during rapid changes (e.g., AI streaming)
  const deferredCode = useDeferredValue(code)
  const isStale = deferredCode !== code

  // Non-reactive callback for SVG changes
  const handleSvgChange = useEffectEvent((newSvg: string) => {
    onSvgChange?.(newSvg)
  })

  // Render mermaid diagram with deferred code
  useEffect(() => {
    if (!deferredCode.trim()) {
      setSvg("")
      setError(null)
      handleSvgChange("")
      return
    }

    let cancelled = false
    // Sanitize instanceId (remove colons) for valid DOM ID
    const elementId = `mermaid${instanceId.replace(/:/g, "")}`

    const renderDiagram = async () => {
      setIsParsing(true)
      try {
        // Create temporary element in persistent container to avoid unmount issues
        const container = getMermaidRenderContainer()
        const tempEl = document.createElement("div")
        tempEl.id = elementId
        container.appendChild(tempEl)

        const sanitizedCode = preprocessMermaidCode(deferredCode)
        const { svg: renderedSvg } = await mermaid.render(elementId, sanitizedCode)
        if (cancelled) return

        const processedSvg = processSvgForNodeSelection(renderedSvg)
        setSvg(processedSvg)
        setLastValidSvg(processedSvg)
        setError(null)
        handleSvgChange(processedSvg)
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
        // Cleanup temporary mermaid element
        cleanupMermaidElement(elementId)
      }
    }

    renderDiagram()

    return () => {
      cancelled = true
      cleanupMermaidElement(elementId)
    }
  }, [deferredCode, isUpdating])

  // Plugin context - use deferredCode for stability during rapid updates
  const displaySvg = svg || lastValidSvg
  const ctx: MermaidPluginContext = useMemo(
    () => ({
      code: deferredCode,
      svg: displaySvg,
      containerRef,
      isUpdating,
      isParsing,
      conversationId,
      document: documentContent,
      onDocumentChange,
    }),
    [
      deferredCode,
      displaySvg,
      isUpdating,
      isParsing,
      conversationId,
      documentContent,
      onDocumentChange,
    ]
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

  // When error occurs and showError is false, return null if no valid SVG to display
  if (error && !showError && !displaySvg) {
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

  // Combine loading states: isUpdating (external), isParsing (internal), isStale (deferred)
  const isLoading = isUpdating || isParsing || isStale

  // Core SVG container
  let svgContainer = (
    <div
      className={cn(
        "mermaid-container w-full h-full flex items-center justify-center p-4",
        isLoading && "opacity-50 grayscale-[0.5] transition-[opacity,filter] duration-300"
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid SVG output
      dangerouslySetInnerHTML={{ __html: displaySvg }}
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

      {/* Plugin controls */}
      {plugins.map((plugin) => plugin.renderControls?.(ctx))}
    </div>
  )
})
