import { createCodeViewPlugin } from "./code-view-plugin"
import { createExportPlugin } from "./export-plugin"
import { createTransformPlugin } from "./transform-plugin"
import type { MermaidPlugin } from "./types"

/**
 * Full-featured plugins preset:
 * - Pan & zoom with controls
 * - Export to PNG & copy code
 * - View source code dialog
 */
export function fullPlugins(options?: { onNodeSelect?: (selection: string) => void }): MermaidPlugin[] {
  const plugins: MermaidPlugin[] = [
    createTransformPlugin(),
    createExportPlugin(),
    createCodeViewPlugin(),
  ]

  if (options?.onNodeSelect) {
    // Dynamically import to avoid circular dependency
    const { createNodeSelectionPlugin } = require("./node-selection-plugin")
    plugins.push(createNodeSelectionPlugin({ onNodeSelect: options.onNodeSelect }))
  }

  return plugins
}
