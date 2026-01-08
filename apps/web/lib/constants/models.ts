export interface Model {
  id: string
  name: string
}

export const MODELS: readonly Model[] = [
  { id: "deepseek-chat", name: "DeepSeek" },
  { id: "claude-sonnet", name: "Claude Sonnet" },
] as const

export type ModelId = (typeof MODELS)[number]["id"]
