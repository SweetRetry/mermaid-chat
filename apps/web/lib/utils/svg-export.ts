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

function prepareSvgForExport(
  svgContent: string
): { svgElement: SVGSVGElement; dimensions: SvgDimensions } | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgContent, "image/svg+xml")
  const svgElement = doc.querySelector("svg")
  if (!svgElement) return null

  const dimensions = parseSvgDimensions(svgElement)

  svgElement.setAttribute("width", `${dimensions.width}`)
  svgElement.setAttribute("height", `${dimensions.height}`)

  if (!svgElement.querySelector("rect[data-background]")) {
    const rect = doc.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("width", "100%")
    rect.setAttribute("height", "100%")
    rect.setAttribute("fill", "white")
    rect.setAttribute("data-background", "true")
    svgElement.insertBefore(rect, svgElement.firstChild)
  }

  svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg")

  return { svgElement, dimensions }
}

function svgToDataUrl(svgElement: SVGSVGElement): string {
  const serializedSvg = new XMLSerializer().serializeToString(svgElement)
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
      ctx.scale(scale, scale)
      ctx.drawImage(image, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob), "image/png")
    }
    image.onerror = () => resolve(null)
    image.src = svgDataUrl
  })
}

export async function exportSvgToPng(
  svgContent: string,
  filename = "diagram.png"
): Promise<boolean> {
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
  link.click()
  URL.revokeObjectURL(pngUrl)

  return true
}
