interface SvgDimensions {
  width: number
  height: number
}

function parseSvgDimensions(svgElement: SVGSVGElement): SvgDimensions {
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

  return { width, height }
}

/**
 * Captures all relevant CSS variables and styles to inline them into the SVG
 */
function getInlinedStyles(): string {
  let styles = ""

  // 1. Capture computed values for used CSS variables
  const computedStyle = getComputedStyle(document.documentElement)
  const themeVars = [
    "--background",
    "--foreground",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--border",
    "--input",
    "--ring",
    "--radius",
    "--chart-1",
    "--chart-2",
    "--chart-3",
    "--chart-4",
    "--chart-5",
    "--destructive",
    "--destructive-foreground",
    // Mermaid custom variables from mermaid-theme.css
    "--mermaid-node-bg",
    "--mermaid-node-border",
    "--mermaid-node-text",
    "--mermaid-edge-color",
    "--mermaid-label-bg",
    "--mermaid-cluster-bg",
  ]

  let varDeclarations = ":root {\n"
  for (const varName of themeVars) {
    const value = computedStyle.getPropertyValue(varName).trim()
    if (value) {
      varDeclarations += `  ${varName}: ${value};\n`
    }
  }

  // Resolve font-family to avoid 'inherit' returning browser default
  const fontFamily = computedStyle.getPropertyValue("font-family")
  varDeclarations += `  font-family: ${fontFamily};\n`

  varDeclarations += "}\n"
  styles += varDeclarations

  // 2. Capture rules from our mermaid-theme.css (via document.styleSheets)
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = Array.from(sheet.cssRules)
        for (const rule of rules) {
          // Detect rules that should be inlined
          if (
            rule.cssText.includes(".mermaid-container") ||
            rule.cssText.includes(".node") ||
            rule.cssText.includes(".edgePath") ||
            rule.cssText.includes(".cluster") ||
            rule.cssText.includes(".actor")
          ) {
            // Clean up the container prefix as the exported SVG is the root
            let cleanRule = rule.cssText
            if (cleanRule.includes(".mermaid-container ")) {
              cleanRule = cleanRule.replace(/\.mermaid-container\s+/g, "")
            }
            styles += `${cleanRule}\n`
          }
        }
      } catch (e) {
        // Skip inaccessible sheets
      }
    }
  } catch (e) {
    console.error("Failed to extract styles for export", e)
  }

  return styles
}

function prepareSvgForExport(
  svgContent: string
): { svgElement: SVGSVGElement; dimensions: SvgDimensions } | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgContent, "image/svg+xml")
  const svgElement = doc.querySelector("svg")
  if (!svgElement) return null

  const dimensions = parseSvgDimensions(svgElement)

  // Set explicit dimensions
  svgElement.setAttribute("width", `${dimensions.width}`)
  svgElement.setAttribute("height", `${dimensions.height}`)

  // Ensure the SVG has a viewBox if it doesn't have one
  if (!svgElement.getAttribute("viewBox")) {
    svgElement.setAttribute("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
  }

  // Inject Styles
  const styleElement = doc.createElementNS("http://www.w3.org/2000/svg", "style")
  styleElement.textContent = getInlinedStyles()
  svgElement.prepend(styleElement)

  // Add Background Rect (matching current theme background)
  const isDark = document.documentElement.classList.contains("dark")
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue("--background")

  if (!svgElement.querySelector("rect[data-background]")) {
    const rect = doc.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("width", "100%")
    rect.setAttribute("height", "100%")
    rect.setAttribute("fill", bgColor || (isDark ? "#09090b" : "#ffffff"))
    rect.setAttribute("data-background", "true")
    // Use prepend to ensure it's behind everything but after style
    svgElement.insertBefore(
      rect,
      svgElement.querySelector("style")?.nextSibling || svgElement.firstChild
    )
  }

  svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg")

  return { svgElement, dimensions }
}

function svgToDataUrl(svgElement: SVGSVGElement): string {
  const serializedSvg = new XMLSerializer().serializeToString(svgElement)
  // Use unescape(encodeURIComponent) to handle unicode characters in labels
  const svgBase64 = btoa(unescape(encodeURIComponent(serializedSvg)))
  return `data:image/svg+xml;base64,${svgBase64}`
}

async function renderSvgToBlob(
  svgDataUrl: string,
  width: number,
  height: number,
  scale = 2
): Promise<Blob | null> {
  const image = new Image()

  return new Promise<Blob | null>((resolve) => {
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(null)
        return
      }

      // Fill background for non-transparent export
      const isDark = document.documentElement.classList.contains("dark")
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue("--background")
      ctx.fillStyle = bgColor || (isDark ? "#09090b" : "#ffffff")
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.scale(scale, scale)
      ctx.drawImage(image, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob), "image/png")
    }
    image.onerror = (e) => {
      console.error("Image loading error during export", e)
      resolve(null)
    }
    image.src = svgDataUrl
  })
}

export async function exportSvgToPng(
  svgContent: string,
  filename = "diagram.png"
): Promise<boolean> {
  try {
    const prepared = prepareSvgForExport(svgContent)
    if (!prepared) return false

    const { svgElement, dimensions } = prepared
    const svgDataUrl = svgToDataUrl(svgElement)
    const pngBlob = await renderSvgToBlob(svgDataUrl, dimensions.width, dimensions.height)

    if (!pngBlob) return false

    const pngUrl = URL.createObjectURL(pngBlob)
    const link = document.createElement("a")
    link.href = pngUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(pngUrl)

    return true
  } catch (error) {
    console.error("Export failed", error)
    return false
  }
}
