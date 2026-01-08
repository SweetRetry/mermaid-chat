"use client"

import { type RefObject, useCallback, useEffect } from "react"

function formatSelection(id: string | null, label: string | null): string {
  if (id && label) return `#${id}(${label})`
  if (id) return `#${id}`
  if (label) return label
  return ""
}

function extractNodeInfo(eventTarget: EventTarget | null, event?: Event | null) {
  const composedPath = event?.composedPath?.call(event) ?? []
  const elements: Element[] = []

  if (eventTarget instanceof Element) {
    elements.push(eventTarget)
  }
  for (const item of composedPath) {
    if (item instanceof Element && !elements.includes(item)) {
      elements.push(item)
    }
  }

  const directText = elements.find(
    (el) => el.tagName.toLowerCase() === "text" && el.textContent?.trim()
  )
  const directLabel = directText?.textContent?.trim() ?? null

  const directHtml = elements.find(
    (el) => ["P", "SPAN"].includes(el.tagName) || el.classList.contains("nodeLabel")
  )
  const htmlLabel = directHtml?.textContent?.trim() ?? null

  const selector = ".node, .actor, .message, .cluster, .edgeLabel, .label, .task, .section, g"
  const group =
    elements.find((el) => el.matches(selector)) ??
    elements.find((el) => el.closest(selector))?.closest(selector) ??
    (eventTarget instanceof Element ? eventTarget.closest(selector) : null)

  const groupId = group?.getAttribute("id") ?? null
  if (!group && !directLabel && !htmlLabel) return null

  const foreignLabel = group?.querySelector(".nodeLabel, foreignObject p, foreignObject span")
  const foreignText = foreignLabel?.textContent?.trim() ?? null

  const dataNodeId =
    elements.find((el) => el.hasAttribute("data-node-id"))?.getAttribute("data-node-id") ??
    foreignLabel?.closest("[data-node-id]")?.getAttribute("data-node-id") ??
    null

  const parts = group
    ? Array.from(group.querySelectorAll("text"))
        .map((el) => el.textContent?.trim())
        .filter((value): value is string => Boolean(value))
    : []

  const groupLabel = parts.length > 0 ? parts.join(" ") : null

  const fallbackLabel = group
    ? (group.getAttribute("aria-label") ?? group.getAttribute("data-name") ?? group.id)
    : null

  const label = foreignText ?? groupLabel ?? htmlLabel ?? directLabel ?? fallbackLabel

  return {
    id: dataNodeId ?? groupId,
    label,
  }
}

interface UseNodeSelectionOptions {
  containerRef: RefObject<HTMLDivElement | null>
  svg: string
  onNodeSelect?: (selection: string) => void
}

export function useNodeSelection({ containerRef, svg, onNodeSelect }: UseNodeSelectionOptions): {
  handleNodeSelect: (eventTarget: EventTarget | null, event?: Event | null) => void
} {
  const handleNodeSelect = useCallback(
    (eventTarget: EventTarget | null, event?: Event | null) => {
      if (!onNodeSelect) return

      const nodeInfo = extractNodeInfo(eventTarget, event)
      if (!nodeInfo) return

      const selection = formatSelection(nodeInfo.id, nodeInfo.label)
      if (selection) {
        onNodeSelect(selection)
      }
    },
    [onNodeSelect]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || !svg) return

    const state = {
      startX: 0,
      startY: 0,
      moved: false,
      target: null as EventTarget | null,
    }

    const onPointerDown = (event: PointerEvent) => {
      state.startX = event.clientX
      state.startY = event.clientY
      state.moved = false
      state.target = event.target
    }

    const onPointerMove = (event: PointerEvent) => {
      const dx = Math.abs(event.clientX - state.startX)
      const dy = Math.abs(event.clientY - state.startY)
      if (dx > 4 || dy > 4) {
        state.moved = true
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (state.moved) return
      handleNodeSelect(state.target ?? event.target, event)
    }

    container.addEventListener("pointerdown", onPointerDown, { capture: true })
    container.addEventListener("pointermove", onPointerMove, { capture: true })
    container.addEventListener("pointerup", onPointerUp, { capture: true })

    return () => {
      container.removeEventListener("pointerdown", onPointerDown, { capture: true })
      container.removeEventListener("pointermove", onPointerMove, { capture: true })
      container.removeEventListener("pointerup", onPointerUp, { capture: true })
    }
  }, [containerRef, handleNodeSelect, svg])

  return { handleNodeSelect }
}
