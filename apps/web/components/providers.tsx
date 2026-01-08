"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import * as React from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      forcedTheme="dark"
      disableTransitionOnChange
      enableColorScheme
    >
      {children}
    </NextThemesProvider>
  )
}
