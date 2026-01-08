import { AppShell } from "@/components/chat/app-shell"
import { parseLayout } from "@/lib/utils/layout"
import { cookies } from "next/headers"

const GROUP_ID = "mermaid-chat-panels"
const FALLBACK_LAYOUT = { preview: 75, chat: 25 }

interface PageProps {
  params: Promise<{ conversationId: string }>
  searchParams: Promise<{ prompt?: string }>
}

export default async function ChatPage({ params, searchParams }: PageProps) {
  const { conversationId } = await params
  const { prompt } = await searchParams
  const cookieStore = await cookies()
  const defaultLayout =
    parseLayout(cookieStore.get(GROUP_ID)?.value, ["preview", "chat"]) ?? FALLBACK_LAYOUT

  return (
    <AppShell
      defaultLayout={defaultLayout}
      groupId={GROUP_ID}
      conversationId={conversationId}
      initialPrompt={prompt}
    />
  )
}
