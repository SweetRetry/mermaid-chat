import { createContextMenuPlugin } from "./context-menu-plugin"
import { createTransformPlugin } from "./transform-plugin"
import type { MermaidPlugin } from "./types"

/**
 * Full-featured plugins preset:
 * - Pan & zoom with controls
 * - Right-click context menu (copy code, export PNG)
 */
export function fullPlugins(options?: { onNodeSelect?: (selection: string) => void }): MermaidPlugin[] {
  const plugins: MermaidPlugin[] = [
    createContextMenuPlugin(),
    createTransformPlugin(),
  ]

  if (options?.onNodeSelect) {
    // Dynamically import to avoid circular dependency
    const { createNodeSelectionPlugin } = require("./node-selection-plugin")
    plugins.push(createNodeSelectionPlugin({ onNodeSelect: options.onNodeSelect }))
  }

  return plugins
}
