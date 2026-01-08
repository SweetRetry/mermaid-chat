"use client"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { Sidebar, SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"

interface SidebarLayoutProps {
  children: React.ReactNode
  defaultOpen?: boolean
}

export function SidebarLayout({ children, defaultOpen = true }: SidebarLayoutProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
