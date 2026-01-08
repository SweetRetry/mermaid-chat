import { Geist, Geist_Mono } from "next/font/google"
import { cookies } from "next/headers"

import "@workspace/ui/globals.css"

import { SidebarLayout } from "@/components/layout/sidebar-layout"
import { Providers } from "@/components/providers"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const SIDEBAR_COOKIE_NAME = "sidebar_state"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const sidebarState = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value
  const defaultOpen = sidebarState !== "false"

  return (
    <html lang="en" suppressHydrationWarning className="w-full h-full">
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased w-full h-full`}
      >
        <Providers>
          <SidebarLayout defaultOpen={defaultOpen}>{children}</SidebarLayout>
        </Providers>
      </body>
    </html>
  )
}
