export interface Model {
  id: string
  name: string
}

export const MODELS: readonly Model[] = [
  { id: "deepseek-chat", name: "DeepSeek" },
  { id: "seed1.8", name: "Seed 1.8" },
] as const

export type ModelId = (typeof MODELS)[number]["id"]
