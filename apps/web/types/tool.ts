import type { ToolUIPart } from "ai"

export type ChartType = "mermaid" | "echarts"

export interface UpdateChartToolInput {
  chartType: ChartType
  code: string
  description: string
}

export interface UpdateChartToolOutput {
  success: boolean
  chartType: ChartType
  code: string
  description: string
}

export type UpdateChartToolUIPart = ToolUIPart<{
  update_chart: {
    input: UpdateChartToolInput
    output: UpdateChartToolOutput
  }
}>
