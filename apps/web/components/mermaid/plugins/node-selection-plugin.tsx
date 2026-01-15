"use client"

import { useEffect } from "react"
import { useNodeSelection } from "@/hooks/use-node-selection"
import type { MermaidPlugin, MermaidPluginContext } from "./types"

interface NodeSelectionPluginOptions {
  onNodeSelect?: (selection: string) => void
}

function NodeSelectionHandler({
  ctx,
  onNodeSelect,
}: {
  ctx: MermaidPluginContext
  onNodeSelect?: (selection: string) => void
}) {
  const { handleNodeSelect } = useNodeSelection({
    containerRef: ctx.containerRef,
    svg: ctx.svg,
    onNodeSelect,
  })

  // Handle keyboard events for accessibility
  useEffect(() => {
    const container = ctx.containerRef.current
    if (!container) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return
      event.preventDefault()
      handleNodeSelect(event.target, event)
    }

    container.addEventListener("keydown", onKeyDown)
    return () => container.removeEventListener("keydown", onKeyDown)
  }, [ctx.containerRef, handleNodeSelect])

  return null
}

export function createNodeSelectionPlugin(options: NodeSelectionPluginOptions = {}): MermaidPlugin {
  return {
    name: "node-selection",
    renderControls: (ctx) => (
      <NodeSelectionHandler key="node-selection" ctx={ctx} onNodeSelect={options.onNodeSelect} />
    ),
  }
}
