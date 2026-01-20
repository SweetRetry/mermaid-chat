import type { ToolUIPart } from "ai"

export type ChartType = "mermaid" | "echarts"

/** User selection for which chart renderer to use */
export type ChartTarget = "auto" | "mermaid" | "echarts" | "both"

/** Multi-chart storage structure */
export interface ChartsData {
  mermaid?: { code: string; updatedAt: string }
  echarts?: { code: string; updatedAt: string }
}

/** Tool input for Mermaid chart updates */
export interface UpdateMermaidToolInput {
  code: string
  description: string
}

/** Tool input for ECharts chart updates */
export interface UpdateEChartsToolInput {
  code: string
  description: string
}

/** Tool output for chart updates */
export interface UpdateChartToolOutput {
  success: boolean
  chartType: ChartType
  code: string
  description: string
}

/** Combined tool UI part type for both chart tools */
export type UpdateChartToolUIPart = ToolUIPart<{
  update_mermaid_chart: {
    input: UpdateMermaidToolInput
    output: UpdateChartToolOutput
  }
  update_echarts_chart: {
    input: UpdateEChartsToolInput
    output: UpdateChartToolOutput
  }
}>
