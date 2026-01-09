import { useMermaidContext } from "@/components/mermaid/mermaid-context"
import type { UpdateChartToolUIPart } from "@/types/tool"
import type { UIMessage } from "@ai-sdk/react"
import { useEffect, useRef } from "react"

/**
 * Custom hook to monitor a stream of chat messages and extract
 * Mermaid diagram updates from tool calls.
 */
export function useMermaidUpdates(messages: UIMessage[]) {
  const { setLatestMermaidCode, setIsMermaidUpdating, latestMermaidCode } = useMermaidContext()

  // Use ref to track current chart to avoid re-render cycles when reading currentChart
  const currentChartRef = useRef(latestMermaidCode)
  useEffect(() => {
    currentChartRef.current = latestMermaidCode
  }, [latestMermaidCode])

  useEffect(() => {
    if (messages.length === 0) {
      setIsMermaidUpdating(false)
      return
    }

    let isUpdating = false

    // Scan backwards for the latest assistant message containing an update_chart tool call
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (!msg || msg.role !== "assistant") continue

      const parts = msg.parts || []
      const updatePart = parts.find((p) => p.type === "tool-update_chart") as
        | UpdateChartToolUIPart
        | undefined

      if (updatePart) {
        // If the tool is still in progress (streaming or called but not finished), mark as updating
        const isStreaming = updatePart.state !== "output-available"
        const code = isStreaming ? updatePart.input?.code : updatePart.output?.code

        if (isStreaming) {
          isUpdating = true
        }

        // Only update if the code has actually changed
        if (code && code !== currentChartRef.current) {
          setLatestMermaidCode(code)
        }

        // We only care about the very latest update_chart call
        break
      }
    }

    setIsMermaidUpdating(isUpdating)
  }, [messages, setIsMermaidUpdating, setLatestMermaidCode])
}
