"use client"

import { ChatInput } from "@/components/chat/chat-input"
import { ConversationCard } from "@/components/conversation/conversation-card"
import { useConversations } from "@/hooks/use-conversations"
import { type PendingMessage, savePendingMessage } from "@/lib/utils/pending-message"
import type { PromptInputMessage } from "@workspace/ui/ai-elements/prompt-input"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

const EXAMPLES = [
  {
    icon: "🍌",
    label: "User Login Flow",
    prompt: "Create a flowchart for a user login process with OAuth and email options",
  },
  {
    icon: "📝",
    label: "API Sequence",
    prompt:
      "Generate a sequence diagram showing how a frontend app authenticates with a backend API",
  },
  {
    icon: "🎓",
    label: "Project Timeline",
    prompt: "Show me a Gantt chart for a 2-week software release cycle",
  },
  {
    icon: "⚡",
    label: "E-commerce Model",
    prompt: "Draw a class diagram for a basic E-commerce system with Orders, Products and Users",
  },
] as const

export default function Page() {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [isPending, startTransition] = useTransition()
  const { conversations, createConversation, deleteConversation, isLoading } = useConversations()

  // Local chat settings
  const [model, setModel] = useState("seed1.8")
  const [thinking, setThinking] = useState(false)
  const [webSearch, setWebSearch] = useState(false)

  // Prevent hydration mismatch by using a stable initial state
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim() && message.files.length === 0) return

    startTransition(async () => {
      const pending: PendingMessage = {
        text: message.text,
        files: message.files,
      }
      savePendingMessage(pending)

      const conversationId = await createConversation()
      if (conversationId) {
        router.push(`/chat/${conversationId}`)
      }
    })
  }

  const handleExampleClick = (prompt: string) => {
    handleSubmit({ text: prompt, files: [] })
  }

  // Use a stable layout that doesn't rely on isMounted for the main structure
  // This avoids the height jump after hydration
  const hasHistory = conversations.length > 0 || isLoading

  return (
    <main className="min-h-screen bg-background overflow-auto">
      <div className="container mx-auto px-6 sm:px-8">
        {/* Fixed Padding Hero - Stable regardless of history state */}
        <section
          className={cn(
            "flex flex-col justify-center space-y-10 max-w-4xl pt-[20vh] pb-12 mx-auto transition-[padding] duration-700 ease-in-out"
          )}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              设计图表，从未如此简单
            </h1>
            <p className="text-base md:text-lg text-muted-foreground/70 max-w-xl mx-auto">
              只需一句话，即可生成流程图、时序图、甘特图等多种图表。
            </p>
          </div>

          <div className="space-y-6">
            <ChatInput
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              status={isPending ? "streaming" : "ready"}
              disabled={isPending}
              placeholder="问问 Mermaid..."
              model={model}
              onModelChange={setModel}
              thinking={thinking}
              onThinkingChange={setThinking}
              webSearch={webSearch}
              onWebSearchChange={setWebSearch}
            />

            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((example) => (
                <Button
                  key={example.label}
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4 border-border/40 hover:bg-accent/50"
                  disabled={isPending}
                  onClick={() => handleExampleClick(example.prompt)}
                >
                  {example.icon} {example.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Multi-step reveal for history to soften the entry */}
        {isMounted && hasHistory && (
          <section className="space-y-8 pb-32 animate-in fade-in slide-in-from-top-4 duration-1000">
            <h2 className="font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-3">
              最近的绘图
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-xl bg-muted/40" />
                  ))
                : conversations.map((conversation) => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      onSelect={(id) => router.push(`/chat/${id}`)}
                      onDelete={deleteConversation}
                    />
                  ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
