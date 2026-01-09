"use client"

import type { ReactNode } from "react"
import { createContext, useContext } from "react"

export interface MermaidContextValue {
  latestMermaidCode: string
  setLatestMermaidCode: (code: string) => void
  isMermaidUpdating: boolean
  setIsMermaidUpdating: (updating: boolean) => void
}

const MermaidContext = createContext<MermaidContextValue | null>(null)

export function useMermaidContext() {
  const context = useContext(MermaidContext)
  if (!context) {
    throw new Error("useMermaidContext must be used within MermaidContextProvider")
  }
  return context
}

export function MermaidContextProvider({
  value,
  children,
}: {
  value: MermaidContextValue
  children: ReactNode
}) {
  return <MermaidContext.Provider value={value}>{children}</MermaidContext.Provider>
}
