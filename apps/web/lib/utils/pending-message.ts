export const PENDING_MESSAGE_KEY = "mermaid-chat-pending-message"

export interface PendingMessage {
  text: string
  files: Array<{ type: "file"; mediaType: string; url: string }>
}

export function savePendingMessage(message: PendingMessage): void {
  try {
    sessionStorage.setItem(PENDING_MESSAGE_KEY, JSON.stringify(message))
  } catch {
    // sessionStorage may be unavailable (e.g., private browsing)
  }
}

export function loadPendingMessage(): PendingMessage | null {
  try {
    const stored = sessionStorage.getItem(PENDING_MESSAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as PendingMessage
  } catch {
    return null
  }
}

export function clearPendingMessage(): void {
  try {
    sessionStorage.removeItem(PENDING_MESSAGE_KEY)
  } catch {
    // sessionStorage may be unavailable
  }
}
