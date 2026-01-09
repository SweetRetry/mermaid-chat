import type { ReactNode, RefObject } from "react"

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
