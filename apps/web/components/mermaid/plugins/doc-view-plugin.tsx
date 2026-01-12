"use client"

import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Markdown } from "tiptap-markdown"
import "@workspace/ui/styles/tiptap-styles.css"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { Download, FileText, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { useCallback, useState } from "react"
import type { MermaidPlugin, MermaidPluginContext } from "./types"

interface TiptapRendererProps {
  content: string
}

function TiptapRenderer({ content }: TiptapRendererProps) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4] },
          codeBlock: {
            languageClassPrefix: "language-",
            HTMLAttributes: {
              class: "code-block",
            },
          },
          code: {
            HTMLAttributes: {
              class: "inline-code",
            },
          },
          bulletList: {
            HTMLAttributes: {
              class: "bullet-list",
            },
          },
          orderedList: {
            HTMLAttributes: {
              class: "ordered-list",
            },
          },
          blockquote: {
            HTMLAttributes: {
              class: "blockquote",
            },
          },
        }),
        Markdown.configure({
          html: true,
          breaks: false,
          linkify: true,
          transformPastedText: true,
          transformCopiedText: true,
        }),
      ],
      content,
      editable: false,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "tiptap-editor",
        },
      },
    },
    [content] // Re-create editor when content changes
  )

  return <EditorContent editor={editor} />
}

interface DocViewControlsProps {
  ctx: MermaidPluginContext
}

function DocViewControls({ ctx }: DocViewControlsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")

  const hasDocument = Boolean(ctx.document)
  const displayContent = isGenerating ? streamingContent : ctx.document || ""

  const generateDocument = useCallback(async () => {
    if (!ctx.conversationId) return

    setIsGenerating(true)
    setStreamingContent("")

    try {
      const response = await fetch(`/api/conversations/${ctx.conversationId}/document`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to generate document")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader available")

      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setStreamingContent(accumulated)
      }

      // Notify parent of document change
      ctx.onDocumentChange?.(accumulated)
    } catch (error) {
      console.error("Failed to generate document:", error)
    } finally {
      setIsGenerating(false)
    }
  }, [ctx.conversationId, ctx.onDocumentChange])

  const handleOpen = useCallback((open: boolean) => {
    setIsOpen(open)
  }, [])

  const handleExport = useCallback(() => {
    if (!displayContent) return

    const blob = new Blob([displayContent], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "document.md"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [displayContent])

  // Don't show if no conversation or no code
  if (!ctx.conversationId || !ctx.code) {
    return null
  }

  const docTitleMatch = displayContent.match(/^#\s+(.*)$/m)
  const docTitle = docTitleMatch?.[1] || "Document"
  // Remove the first H1 line to avoid duplication with the header title
  const bodyContent = docTitleMatch
    ? displayContent.replace(/^#\s+.*(\r?\n|$)/m, "").trim()
    : displayContent

  return (
    <div className="absolute top-4 right-[52px] z-20">
      <Sheet open={isOpen} onOpenChange={handleOpen}>
        <SheetTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 bg-background/60 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl"
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-8 rounded-lg transition-colors duration-300",
                hasDocument
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="View Document"
            >
              <FileText className="size-4" />
            </Button>
          </motion.div>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl flex flex-col p-4 border-l border-white/10 overflow-hidden"
        >
          <SheetHeader className="flex-row items-center justify-between space-y-0">
            <SheetTitle className="flex items-center gap-2 text-3xl font-bold tracking-tight line-clamp-1 pr-4">
              {docTitle}
            </SheetTitle>
            <div className="flex items-center gap-2 pr-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2 bg-background/50 border-white/10 hover:bg-primary/5 hover:border-primary/20 transition-all"
                onClick={generateDocument}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {hasDocument ? "Sync" : "Generate"}
              </Button>
              {hasDocument && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2 bg-background/50 border-white/10 hover:bg-primary/5 hover:border-primary/20 transition-all"
                  onClick={handleExport}
                >
                  <Download className="size-3.5" />
                  Export
                </Button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-2 h-full overflow-auto">
            <AnimatePresence mode="wait">
              {bodyContent ? (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <TiptapRenderer content={bodyContent} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-24 px-6 text-center"
                >
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                    <div className="relative size-20 rounded-2xl bg-muted border flex items-center justify-center shadow-xl">
                      <FileText className="size-10 text-muted-foreground/50" />
                    </div>
                    {isGenerating && (
                      <div className="absolute -bottom-2 -right-2 p-1.5 bg-background rounded-full border shadow-lg">
                        <Loader2 className="size-4 text-primary animate-spin" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-semibold mb-2">No Document Generated Yet</h3>
                  <p className="text-muted-foreground mb-8 max-w-[280px]">
                    Transform your Mermaid diagram into a professional, structured document with one
                    click.
                  </p>

                  <Button
                    size="lg"
                    onClick={generateDocument}
                    disabled={isGenerating}
                    className="rounded-full px-8 gap-2 shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95"
                  >
                    {isGenerating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Generate Now
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function createDocViewPlugin(): MermaidPlugin {
  return {
    name: "doc-view",
    renderControls: (ctx) => <DocViewControls key="doc-view-controls" ctx={ctx} />,
  }
}
