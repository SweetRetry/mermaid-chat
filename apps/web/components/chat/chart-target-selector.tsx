"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"
import { BarChart3, GitBranch, Sparkles, Layers } from "lucide-react"
import type { ChartsData, ChartTarget } from "@/types/tool"

interface ChartTargetSelectorProps {
  value: ChartTarget
  onChange: (value: ChartTarget) => void
  hasCharts: { mermaid: boolean; echarts: boolean }
  className?: string
}

const OPTIONS = [
  {
    value: "auto" as const,
    label: "Auto",
    icon: Sparkles,
  },
  {
    value: "mermaid" as const,
    label: "Mermaid",
    icon: GitBranch,
  },
  {
    value: "echarts" as const,
    label: "ECharts",
    icon: BarChart3,
  },
  {
    value: "both" as const,
    label: "Both",
    icon: Layers,
  },
]

export function ChartTargetSelector({
  value,
  onChange,
  hasCharts,
  className,
}: ChartTargetSelectorProps) {
  const hasBothCharts = hasCharts.mermaid && hasCharts.echarts
  const availableOptions = OPTIONS.filter((opt) => opt.value !== "both" || hasBothCharts)
  const selectedOption = availableOptions.find((opt) => opt.value === value) ?? availableOptions[0]!

  return (
    <Select value={value} onValueChange={(v) => onChange(v as ChartTarget)}>
      <SelectTrigger
        size="sm"
        className={cn(
          "h-7 gap-1.5 border-none shadow-none bg-transparent hover:bg-muted/50 px-2",
          className
        )}
        title="Select chart renderer"
      >
        <SelectValue>
          <selectedOption.icon className="size-3.5" />
          <span className="text-xs">{selectedOption.label}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {availableOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <option.icon className="size-4" />
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
