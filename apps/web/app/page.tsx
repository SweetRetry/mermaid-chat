"use client"

import { ChatInput } from "@/components/chat/chat-input"
import { useChatStore } from "@/lib/store/chat-store"
import { Button } from "@workspace/ui/components/button"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

const EXAMPLES = [
  {
    label: "User Login Flow",
    prompt: "Create a flowchart for a user login process with OAuth and email options",
  },
  {
    label: "API Sequence",
    prompt:
      "Generate a sequence diagram showing how a frontend app authenticates with a backend API",
  },
  {
    label: "Project Timeline",
    prompt: "Show me a Gantt chart for a 2-week software release cycle",
  },
  {
    label: "E-commerce Model",
    prompt: "Draw a class diagram for a basic E-commerce system with Orders, Products and Users",
  },
] as const

export default function Page() {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [isPending, startTransition] = useTransition()
  const [model, setModel] = useState("deepseek-chat")
  const createConversation = useChatStore((state) => state.createConversation)

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim()) return

    startTransition(async () => {
      const conversationId = await createConversation()
      if (conversationId) {
        // Pass prompt via URL - event-driven, no intermediate store state
        router.push(`/chat/${conversationId}?prompt=${encodeURIComponent(prompt)}`)
      }
    })
  }

  return (
    <div className="h-full flex flex-col items-center justify-center -mt-20 p-6 bg-background">
      <div className="w-full max-w-3xl space-y-10">
        {/* Hero Section - Matching Image Style Exactly */}
        <div className="space-y-4 px-4">
          <div className="flex items-center gap-3 text-2xl md:text-3xl font-medium tracking-tight">
            <span className="text-yellow-400">✨</span>
            <span className="text-foreground/80">ziming, 你好</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground/90">
            需要我为你做些什么？
          </h1>
        </div>

        {/* Input Section */}
        <div className="relative">
          <ChatInput
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            status={isPending ? "streaming" : "ready"}
            disabled={isPending}
            placeholder="问问 Mermaid..."
            model={model}
            onModelChange={setModel}
            className="shadow-2xl shadow-primary/5"
          />
        </div>

        {/* Examples Section - Suggestions Chips */}
        <div className="flex flex-wrap justify-center gap-3">
          {EXAMPLES.map((example) => (
            <Button
              key={example.label}
              variant="outline"
              className="rounded-full h-11 px-6 bg-secondary/50 border-none hover:bg-secondary/80 transition-all text-sm font-medium flex items-center gap-2"
              disabled={isPending}
              onClick={() => handleSubmit(example.prompt)}
            >
              {example.label === "User Login Flow" && <span className="text-lg">🍌</span>}
              {example.label === "API Sequence" && <span className="text-lg">📝</span>}
              {example.label === "Project Timeline" && <span className="text-lg">🎓</span>}
              {example.label === "E-commerce Model" && <span className="text-lg">⚡</span>}
              <span>{example.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
