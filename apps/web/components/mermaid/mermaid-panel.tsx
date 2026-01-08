"use client"

import { useChatStore } from "@/lib/store/chat-store"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { Check, Code, Copy, Download, Eye } from "lucide-react"
import { useState } from "react"
import { MermaidRenderer } from "./mermaid-renderer"

interface MermaidPanelProps {
  className?: string
}

export interface Example {
  label: string
  prompt: string
}

export const EXAMPLES: Example[] = [
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
]

export function MermaidPanel({ className }: MermaidPanelProps) {
  const code = useChatStore((state) => state.mermaidCode)
  const handleSelectExample = useChatStore((state) => state.handleSelectExample)
  const appendInputText = useChatStore((state) => state.appendInputText)
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [svgContent, setSvgContent] = useState("")
  const [exporting, setExporting] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportPng = async () => {
    if (!svgContent) return
    setExporting(true)

    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgContent, "image/svg+xml")
      const svgElement = doc.querySelector("svg")
      if (!svgElement) return

      const widthAttr = svgElement.getAttribute("width") ?? ""
      const heightAttr = svgElement.getAttribute("height") ?? ""
      let width = Number.parseFloat(widthAttr)
      let height = Number.parseFloat(heightAttr)

      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        const viewBox = svgElement.getAttribute("viewBox")
        if (viewBox) {
          const viewBoxValues = viewBox.split(/[\s,]+/).map(Number)
          if (viewBoxValues.length === 4) {
            const viewWidth = viewBoxValues[2] ?? Number.NaN
            const viewHeight = viewBoxValues[3] ?? Number.NaN
            if (Number.isFinite(viewWidth) && Number.isFinite(viewHeight)) {
              width = viewWidth
              height = viewHeight
            }
          }
        }
      }

      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        width = 800
        height = 600
      }

      svgElement.setAttribute("width", `${width}`)
      svgElement.setAttribute("height", `${height}`)

      if (!svgElement.querySelector("rect[data-background]")) {
        const rect = doc.createElementNS("http://www.w3.org/2000/svg", "rect")
        rect.setAttribute("width", "100%")
        rect.setAttribute("height", "100%")
        rect.setAttribute("fill", "white")
        rect.setAttribute("data-background", "true")
        svgElement.insertBefore(rect, svgElement.firstChild)
      }

      // Add xmlns attribute to ensure proper rendering
      svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg")

      const serializedSvg = new XMLSerializer().serializeToString(svgElement)
      // Use base64 data URL instead of Blob URL to avoid tainted canvas
      const svgBase64 = btoa(unescape(encodeURIComponent(serializedSvg)))
      const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`
      const image = new Image()

      const pngBlob = await new Promise<Blob | null>((resolve) => {
        image.onload = () => {
          const scale = 2
          const canvas = document.createElement("canvas")
          canvas.width = width * scale
          canvas.height = height * scale
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            resolve(null)
            return
          }
          ctx.scale(scale, scale)
          ctx.drawImage(image, 0, 0, width, height)
          canvas.toBlob((blob) => resolve(blob), "image/png")
        }
        image.onerror = () => resolve(null)
        image.src = svgDataUrl
      })

      if (!pngBlob) return

      const pngUrl = URL.createObjectURL(pngBlob)
      const link = document.createElement("a")
      link.href = pngUrl
      link.download = "diagram.png"
      link.click()
      URL.revokeObjectURL(pngUrl)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 h-12 border-b bg-muted/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-primary/60 animate-pulse" />
          <span className="text-sm font-semibold tracking-tight">Diagram Preview</span>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-background/50 rounded-lg border">
          <Button
            variant={showCode ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowCode(!showCode)}
            className="h-8 px-3 transition-all"
          >
            {showCode ? <Eye className="h-4 w-4 mr-2" /> : <Code className="h-4 w-4 mr-2" />}
            <span className="text-xs font-medium">{showCode ? "Preview" : "View Code"}</span>
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          {code && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8 transition-all hover:bg-primary/10 hover:text-primary"
              title="Copy Mermaid Code"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
          {svgContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPng}
              className="h-8 px-3 transition-all hover:bg-primary/10 hover:text-primary"
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="text-xs font-medium">Export PNG</span>
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {showCode ? (
          <div className="h-full overflow-auto p-6 bg-muted/5 font-mono text-[13px] leading-relaxed">
            <pre className="p-4 rounded-xl border bg-background/50 shadow-sm border-dashed">
              <code>{code || "// No diagram code yet"}</code>
            </pre>
          </div>
        ) : code ? (
          <MermaidRenderer
            code={code}
            className="h-full"
            onSvgChange={setSvgContent}
            onNodeSelect={appendInputText}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center border-2 border-primary/10 border-dashed animate-in fade-in zoom-in duration-500">
              <Code className="size-10 text-primary/40" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-semibold tracking-tight">No diagram generated</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Describe a process or system in the chat to see it visualized here with Mermaid.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-4">
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => handleSelectExample(example.prompt)}
                  className="p-3 rounded-xl border bg-muted/5 text-xs text-muted-foreground hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all text-left group"
                >
                  <div className="font-semibold mb-1 group-hover:text-primary transition-colors text-foreground">
                    {example.label}
                  </div>
                  <div className="opacity-60 line-clamp-1">Click to generate...</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
