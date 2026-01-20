import type { UIMessage } from "@ai-sdk/react"
import { useEffect, useRef } from "react"
import type { ChartType, UpdateChartToolUIPart } from "@/types/tool"

interface UseChartUpdatesOptions {
  messages: UIMessage[]
  latestChartCode: string
  latestChartType: ChartType
  setLatestChartCode: (code: string) => void
  setLatestChartType: (type: ChartType) => void
  setIsChartUpdating: (updating: boolean) => void
}

/**
 * Custom hook to monitor a stream of chat messages and extract
 * chart updates (Mermaid or ECharts) from tool calls.
 */
export function useChartUpdates({
  messages,
  latestChartCode,
  latestChartType,
  setLatestChartCode,
  setLatestChartType,
  setIsChartUpdating,
}: UseChartUpdatesOptions) {
  // Use refs to track current chart state to avoid re-render cycles
  const currentChartRef = useRef({ code: latestChartCode, type: latestChartType })
  useEffect(() => {
    currentChartRef.current = { code: latestChartCode, type: latestChartType }
  }, [latestChartCode, latestChartType])

  useEffect(() => {
    if (messages.length === 0) {
      setIsChartUpdating(false)
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
        const code = isStreaming
          ? updatePart.input?.code
          : updatePart.output?.code || updatePart.input?.code
        const chartType = isStreaming
          ? updatePart.input?.chartType
          : updatePart.output?.chartType || updatePart.input?.chartType

        if (isStreaming) {
          isUpdating = true
        }

        // Only update if the code has actually changed
        if (code && code !== currentChartRef.current.code) {
          setLatestChartCode(code)
        }

        // Update chart type if it has changed
        if (chartType && chartType !== currentChartRef.current.type) {
          setLatestChartType(chartType)
        }

        // We only care about the very latest update_chart call
        break
      }
    }

    setIsChartUpdating(isUpdating)
  }, [messages, setIsChartUpdating, setLatestChartCode, setLatestChartType])
}
