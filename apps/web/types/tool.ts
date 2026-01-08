import type { ToolUIPart } from "ai"

export interface UpdateChartToolInput {
  code: string
  description: string
}

export interface UpdateChartToolOutput {
  success: boolean
  code: string
  description: string
}

export type UpdateChartToolUIPart = ToolUIPart<{
  update_chart: {
    input: UpdateChartToolInput
    output: UpdateChartToolOutput
  }
}>
