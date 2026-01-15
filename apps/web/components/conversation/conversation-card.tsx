"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardFooter } from "@workspace/ui/components/card"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { FileCode2, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { MermaidRenderer } from "@/components/mermaid/mermaid-renderer"
import type { Conversation } from "@/types/chat"

dayjs.extend(relativeTime)

interface ConversationCardProps {
  conversation: Conversation
  isActive?: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  showPreview?: boolean
}

export function ConversationCard({
  conversation,
  isActive,
  onSelect,
  onDelete,

  showPreview = true,
}: ConversationCardProps) {
  const [open, setOpen] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(conversation.id)
    setOpen(false)
  }

  const hueRotation = useMemo(() => {
    return conversation.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  }, [conversation.id])

  return (
    <Card
      onClick={() => onSelect(conversation.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(conversation.id)
        }
      }}
      className="group p-0 overflow-hidden hover:shadow-md transition-shadow duration-300"
    >
      <CardContent className="relative p-0 aspect-video overflow-hidden">
        {conversation.latestChartCode && showPreview ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <MermaidRenderer
              code={conversation.latestChartCode}
              showLoading={false}
              showError={false}
              className="size-full pointer-events-none scale-90"
            />
          </div>
        ) : (
          <div
            className="size-full transition-all duration-500"
            style={{ filter: `hue-rotate(${hueRotation}deg)` }}
          >
            <img
              alt="Conversation placeholder"
              className="w-full h-full object-cover brightness-[0.8] grayscale-[0.3] group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-500"
              src="https://images.unsplash.com/photo-1604076850742-4c7221f3101b?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            />
          </div>
        )}

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
              aria-label="Delete conversation"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除该对话？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作将永久删除“{conversation.title || "未命名对话"}”及其所有内容，且无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={(e) => e.stopPropagation()}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>

      <CardFooter className="flex-col items-start gap-1.5 p-3.5">
        <div className="flex items-center gap-2 w-full">
          {conversation.latestChartCode && <FileCode2 className="size-3.5 text-primary shrink-0" />}
          <span className="font-bold text-sm truncate leading-tight flex-1">
            {conversation.title || "Untitled Conversation"}
          </span>
        </div>
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
            {dayjs(conversation.updatedAt).fromNow()}
          </span>
          {isActive && (
            <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
