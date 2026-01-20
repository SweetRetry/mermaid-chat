import type { UIMessage } from "@ai-sdk/react"
import { useEffect, useRef } from "react"
import type { ChartsData, ChartType, UpdateChartToolUIPart } from "@/types/tool"

interface UseChartUpdatesOptions {
  messages: UIMessage[]
  charts: ChartsData
  updateChart: (type: ChartType, code: string) => void
  setIsChartUpdating: (updating: boolean) => void
}

/**
 * Custom hook to monitor a stream of chat messages and extract
 * chart updates (Mermaid or ECharts) from tool calls.
 */
export function useChartUpdates({
  messages,
  charts,
  updateChart,
  setIsChartUpdating,
}: UseChartUpdatesOptions) {
  // Use refs to track current chart state to avoid re-render cycles
  const currentChartsRef = useRef(charts)
  useEffect(() => {
    currentChartsRef.current = charts
  }, [charts])

  useEffect(() => {
    if (messages.length === 0) {
      setIsChartUpdating(false)
      return
    }

    let isUpdating = false

    // Scan backwards for the latest assistant message containing chart tool calls
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (!msg || msg.role !== "assistant") continue

      const parts = msg.parts || []

      // Check for Mermaid chart updates
      const mermaidPart = parts.find((p) => p.type === "tool-update_mermaid_chart") as
        | UpdateChartToolUIPart
        | undefined

      // Check for ECharts updates
      const echartsPart = parts.find((p) => p.type === "tool-update_echarts_chart") as
        | UpdateChartToolUIPart
        | undefined

      let foundUpdate = false

      if (mermaidPart) {
        foundUpdate = true
        const isStreaming = mermaidPart.state !== "output-available"
        const code = isStreaming
          ? mermaidPart.input?.code
          : mermaidPart.output?.code || mermaidPart.input?.code

        if (isStreaming) {
          isUpdating = true
        }

        // Only update if the code has actually changed
        if (code && code !== currentChartsRef.current.mermaid?.code) {
          updateChart("mermaid", code)
        }
      }

      if (echartsPart) {
        foundUpdate = true
        const isStreaming = echartsPart.state !== "output-available"
        const code = isStreaming
          ? echartsPart.input?.code
          : echartsPart.output?.code || echartsPart.input?.code

        if (isStreaming) {
          isUpdating = true
        }

        // Only update if the code has actually changed
        if (code && code !== currentChartsRef.current.echarts?.code) {
          updateChart("echarts", code)
        }
      }

      // We only care about the very latest message with chart updates
      if (foundUpdate) break
    }

    setIsChartUpdating(isUpdating)
  }, [messages, setIsChartUpdating, updateChart])
}
