"use client"

import { ChatInput } from "@/components/chat/chat-input"
import { useChatStore } from "@/lib/store/chat-store"
import { Button } from "@workspace/ui/components/button"
import { MessageSquare } from "lucide-react"
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
  const setInitialPrompt = useChatStore((state) => state.setInitialPrompt)

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim()) return

    startTransition(async () => {
      const conversationId = await createConversation()
      if (conversationId) {
        setInitialPrompt(prompt)
        router.push(`/chat/${conversationId}`)
      }
    })
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="size-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
            <MessageSquare className="size-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Mermaid Chat</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Describe what you want to visualize and let AI generate Mermaid diagrams for you.
          </p>
        </div>

        {/* Input Section */}
        <ChatInput
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          status={isPending ? "streaming" : "ready"}
          disabled={isPending || !input.trim()}
          model={model}
          onModelChange={setModel}
        />

        {/* Examples Section */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">Try an example</p>
          <div className="grid grid-cols-2 gap-3">
            {EXAMPLES.map((example) => (
              <Button
                key={example.label}
                variant="outline"
                className="h-auto py-3 px-4 text-left justify-start"
                disabled={isPending}
                onClick={() => handleSubmit(example.prompt)}
              >
                <span className="text-sm font-medium">{example.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
