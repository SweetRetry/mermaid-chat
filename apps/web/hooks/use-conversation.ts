"use client"

import { conversationKeys, fetchConversationDetail } from "@/lib/api/conversations"
import { useQuery } from "@tanstack/react-query"

/**
 * Hook for loading a specific conversation by ID.
 * Uses TanStack Query for caching and automatic refetching.
 */
export function useConversation(conversationId: string | undefined) {
  const { data: conversationDetail, isLoading } = useQuery({
    queryKey: conversationKeys.detail(conversationId ?? ""),
    queryFn: () => fetchConversationDetail(conversationId!),
    enabled: !!conversationId,
  })

  return { conversationDetail: conversationDetail ?? null, isLoading }
}
