import type { Layout } from "react-resizable-panels"

export const parseLayout = (value: string | undefined, keys: string[]): Layout | undefined => {
  if (!value) return undefined
  try {
    const decoded = decodeURIComponent(value)
    const parsed = JSON.parse(decoded) as Record<string, unknown>
    if (!parsed || typeof parsed !== "object") return undefined

    const layout: Record<string, number> = {}
    for (const key of keys) {
      const val = parsed[key]
      if (typeof val !== "number" || !Number.isFinite(val)) return undefined
      layout[key] = val
    }

    return layout as Layout
  } catch {
    return undefined
  }
}
