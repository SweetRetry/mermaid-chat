import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  conversationKeys,
  createConversation as createConversationApi,
  deleteConversation as deleteConversationApi,
  fetchConversations,
} from "@/lib/api/conversations"
import type { Conversation } from "@/types/chat"

export function useConversations() {
  const queryClient = useQueryClient()

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: conversationKeys.list(),
    queryFn: fetchConversations,
  })

  const createMutation = useMutation({
    mutationFn: createConversationApi,
    onSuccess: (newConversation) => {
      queryClient.setQueryData<Conversation[]>(conversationKeys.list(), (old) =>
        old ? [newConversation, ...old] : [newConversation]
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteConversationApi,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Conversation[]>(conversationKeys.list(), (old) =>
        old ? old.filter((c) => c.id !== deletedId) : []
      )
      queryClient.removeQueries({ queryKey: conversationKeys.detail(deletedId) })
    },
  })

  const createConversation = async (title?: string): Promise<string | null> => {
    try {
      const result = await createMutation.mutateAsync(title)
      return result.id
    } catch {
      return null
    }
  }

  const deleteConversation = async (id: string): Promise<void> => {
    await deleteMutation.mutateAsync(id)
  }

  return {
    conversations,
    isLoading,
    createConversation,
    deleteConversation,
  }
}
