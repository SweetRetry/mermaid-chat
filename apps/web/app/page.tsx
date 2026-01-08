import { cookies } from "next/headers"
import type { Layout } from "react-resizable-panels"
import { AppShell } from "@/components/layout/app-shell"

const GROUP_ID = "mermaid-chat-panels"
const FALLBACK_LAYOUT: Layout = { preview: 75, chat: 25 }

const parseLayout = (value: string | undefined): Layout | undefined => {
  if (!value) return undefined
  try {
    const decoded = decodeURIComponent(value)
    const parsed = JSON.parse(decoded) as Record<string, unknown>
    if (!parsed || typeof parsed !== "object") return undefined
    const preview = parsed.preview
    const chat = parsed.chat
    if (typeof preview !== "number" || typeof chat !== "number") return undefined
    if (!Number.isFinite(preview) || !Number.isFinite(chat)) return undefined
    return { preview, chat }
  } catch {
    return undefined
  }
}

export default async function Page() {
  const cookieStore = await cookies()
  const defaultLayout = parseLayout(cookieStore.get(GROUP_ID)?.value) ?? FALLBACK_LAYOUT

  return <AppShell defaultLayout={defaultLayout} groupId={GROUP_ID} />
}
