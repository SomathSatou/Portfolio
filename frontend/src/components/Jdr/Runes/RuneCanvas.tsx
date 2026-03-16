import React from 'react'
import RuneToolbar from './RuneToolbar'
import type { Stroke } from './types'

interface RuneCanvasProps {
  width: number
  height: number
  referenceImage?: string | null
  initialData?: string | null
  onSave: (imageData: string) => void
}

export default function RuneCanvas({
  width,
  height,
  referenceImage,
  initialData,
  onSave,
}: RuneCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const [tool, setTool] = React.useState<'brush' | 'eraser'>('brush')
  const [brushSize, setBrushSize] = React.useState(3)
  const [color, setColor] = React.useState('#000000')
  const [showGrid, setShowGrid] = React.useState(false)
  const [showReference, setShowReference] = React.useState(!!referenceImage)
  const [referenceOpacity, setReferenceOpacity] = React.useState(30)

  const strokesRef = React.useRef<Stroke[]>([])
  const redoStackRef = React.useRef<Stroke[]>([])
  const currentStrokeRef = React.useRef<Stroke | null>(null)
  const isDrawingRef = React.useRef(false)

  const [canUndo, setCanUndo] = React.useState(false)
  const [canRedo, setCanRedo] = React.useState(false)

  const parchmentRef = React.useRef<HTMLImageElement | null>(null)
  const referenceImgRef = React.useRef<HTMLImageElement | null>(null)
  const initialLoadedRef = React.useRef(false)
  const initialImageRef = React.useRef<HTMLImageElement | null>(null)

  // Load parchment background
  React.useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    // Generate a simple parchment-style gradient using a data URI svg
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.08" intercept="0.92"/>
            <feFuncG type="linear" slope="0.06" intercept="0.87"/>
            <feFuncB type="linear" slope="0.04" intercept="0.78"/>
          </feComponentTransfer>
        </filter>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%" style="stop-color:rgba(245,230,200,0);"/>
          <stop offset="100%" style="stop-color:rgba(160,130,80,0.15);"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" filter="url(#noise)"/>
      <rect width="100%" height="100%" fill="url(#vignette)"/>
    </svg>`
    img.src = `data:image/svg+xml;base64,${btoa(svg)}`
    img.onload = () => {
      parchmentRef.current = img
      redrawCanvas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height])

  // Load reference image
  React.useEffect(() => {
    if (!referenceImage) {
      referenceImgRef.current = null
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = referenceImage
    img.onload = () => {
      referenceImgRef.current = img
      redrawCanvas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceImage])

  // Load initial data (draft reload)
  React.useEffect(() => {
    if (!initialData || initialLoadedRef.current) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = initialData
    img.onload = () => {
      initialImageRef.current = img
      initialLoadedRef.current = true
      redrawCanvas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

  const redrawCanvas = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw parchment background
    if (parchmentRef.current) {
      ctx.drawImage(parchmentRef.current, 0, 0, canvas.width, canvas.height)
    } else {
      ctx.fillStyle = '#f5edd6'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // Draw reference image as watermark
    if (showReference && referenceImgRef.current) {
      ctx.save()
      ctx.globalAlpha = referenceOpacity / 100
      const rImg = referenceImgRef.current
      const scale = Math.min(
        (canvas.width * 0.8) / rImg.width,
        (canvas.height * 0.8) / rImg.height,
      )
      const rw = rImg.width * scale
      const rh = rImg.height * scale
      ctx.drawImage(
        rImg,
        (canvas.width - rw) / 2,
        (canvas.height - rh) / 2,
        rw,
        rh,
      )
      ctx.restore()
    }

    // Draw initial image (draft reload, only if no strokes yet)
    if (initialImageRef.current && strokesRef.current.length === 0) {
      ctx.drawImage(initialImageRef.current, 0, 0, canvas.width, canvas.height)
    }

    // Draw grid
    if (showGrid) {
      ctx.save()
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 0.5
      const step = 40
      for (let x = step; x < canvas.width; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = step; y < canvas.height; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
      ctx.restore()
    }

    // Draw all strokes
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke)
    }

    // Draw current stroke
    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current)
    }
  }, [showGrid, showReference, referenceOpacity])

  React.useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length < 2) return
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = stroke.size

    if (stroke.tool === 'eraser') {
      // For eraser we need to draw the parchment bg back, so use destination-out
      // then redraw... Actually, simplest approach: draw with bg color
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = stroke.color
    }

    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)

    // Smooth with quadratic curves
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2
      const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2
      ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY)
    }

    // Last segment
    const last = stroke.points[stroke.points.length - 1]
    ctx.lineTo(last.x, last.y)
    ctx.stroke()
    ctx.restore()
  }

  function getPointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    isDrawingRef.current = true

    const pos = getPointerPos(e)
    currentStrokeRef.current = {
      points: [pos],
      color,
      size: brushSize,
      tool,
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current || !currentStrokeRef.current) return
    e.preventDefault()
    const pos = getPointerPos(e)
    currentStrokeRef.current.points.push(pos)
    redrawCanvas()
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    e.preventDefault()
    isDrawingRef.current = false
    if (currentStrokeRef.current && currentStrokeRef.current.points.length >= 2) {
      strokesRef.current.push(currentStrokeRef.current)
      redoStackRef.current = []
      setCanUndo(true)
      setCanRedo(false)
    }
    currentStrokeRef.current = null
    redrawCanvas()
  }

  function handleUndo() {
    const stroke = strokesRef.current.pop()
    if (stroke) {
      redoStackRef.current.push(stroke)
      setCanUndo(strokesRef.current.length > 0)
      setCanRedo(true)
      redrawCanvas()
    }
  }

  function handleRedo() {
    const stroke = redoStackRef.current.pop()
    if (stroke) {
      strokesRef.current.push(stroke)
      setCanUndo(true)
      setCanRedo(redoStackRef.current.length > 0)
      redrawCanvas()
    }
  }

  function handleClear() {
    strokesRef.current = []
    redoStackRef.current = []
    initialImageRef.current = null
    setCanUndo(false)
    setCanRedo(false)
    redrawCanvas()
  }

  // Keyboard shortcuts
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Export function
  function exportCanvas(): string {
    const canvas = canvasRef.current
    if (!canvas) return ''

    // Create an export canvas without grid/reference overlay
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return ''

    // Draw parchment bg
    if (parchmentRef.current) {
      ctx.drawImage(parchmentRef.current, 0, 0, exportCanvas.width, exportCanvas.height)
    } else {
      ctx.fillStyle = '#f5edd6'
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    }

    // Draw initial image if no strokes
    if (initialImageRef.current && strokesRef.current.length === 0) {
      ctx.drawImage(initialImageRef.current, 0, 0, exportCanvas.width, exportCanvas.height)
    }

    // Draw all strokes
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke)
    }

    return exportCanvas.toDataURL('image/png')
  }

  // Expose save
  React.useEffect(() => {
    // Attach export to a ref-like approach via the onSave callback pattern
    // The parent calls onSave which triggers export
  }, [onSave])

  // We need a way for the parent to trigger save. Use imperative handle or a simpler approach:
  // Expose a save button in the toolbar area
  const handleSave = () => {
    const data = exportCanvas()
    if (data) onSave(data)
  }

  return (
    <div ref={containerRef} className="space-y-3">
      <RuneToolbar
        tool={tool}
        brushSize={brushSize}
        color={color}
        showGrid={showGrid}
        showReference={showReference}
        referenceOpacity={referenceOpacity}
        hasReference={!!referenceImage}
        canUndo={canUndo}
        canRedo={canRedo}
        onToolChange={setTool}
        onBrushSizeChange={setBrushSize}
        onColorChange={setColor}
        onToggleGrid={() => setShowGrid((v) => !v)}
        onToggleReference={() => setShowReference((v) => !v)}
        onReferenceOpacityChange={setReferenceOpacity}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
      />

      <div className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-inner bg-amber-50 dark:bg-gray-800">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-auto touch-none cursor-crosshair"
          style={{ maxHeight: '70vh' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} className="btn btn-primary">
          Capturer le dessin
        </button>
      </div>
    </div>
  )
}
