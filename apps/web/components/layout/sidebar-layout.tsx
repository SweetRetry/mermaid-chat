"use client"

import { ConversationsProvider } from "@/components/conversation/conversations-context"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Sidebar, SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"

interface SidebarLayoutProps {
  children: React.ReactNode
  defaultOpen?: boolean
}

export function SidebarLayout({ children, defaultOpen = true }: SidebarLayoutProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <ConversationsProvider>
        <Sidebar>
          <AppSidebar />
        </Sidebar>
        <SidebarInset>{children}</SidebarInset>
      </ConversationsProvider>
    </SidebarProvider>
  )
}
