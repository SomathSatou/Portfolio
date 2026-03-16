import React from 'react'

const BRUSH_SIZES = [1, 3, 5, 10] as const
const COLORS = [
  { value: '#000000', label: 'Noir' },
  { value: '#c0392b', label: 'Rouge' },
  { value: '#2980b9', label: 'Bleu' },
  { value: '#f5c024', label: 'Or' },
  { value: '#a0de59', label: 'Vert' },
  { value: '#ffffff', label: 'Blanc' },
] as const

interface RuneToolbarProps {
  tool: 'brush' | 'eraser'
  brushSize: number
  color: string
  showGrid: boolean
  showReference: boolean
  referenceOpacity: number
  hasReference: boolean
  canUndo: boolean
  canRedo: boolean
  onToolChange: (tool: 'brush' | 'eraser') => void
  onBrushSizeChange: (size: number) => void
  onColorChange: (color: string) => void
  onToggleGrid: () => void
  onToggleReference: () => void
  onReferenceOpacityChange: (opacity: number) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
}

export default function RuneToolbar({
  tool,
  brushSize,
  color,
  showGrid,
  showReference,
  referenceOpacity,
  hasReference,
  canUndo,
  canRedo,
  onToolChange,
  onBrushSizeChange,
  onColorChange,
  onToggleGrid,
  onToggleReference,
  onReferenceOpacityChange,
  onUndo,
  onRedo,
  onClear,
}: RuneToolbarProps) {
  const [confirmClear, setConfirmClear] = React.useState(false)

  const handleClear = () => {
    if (confirmClear) {
      onClear()
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      {/* Tools */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onToolChange('brush')}
          className={`p-2 rounded-md transition-colors ${
            tool === 'brush'
              ? 'bg-primary text-white dark:bg-primaryLight dark:text-gray-900'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Pinceau"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
        </button>
        <button
          onClick={() => onToolChange('eraser')}
          className={`p-2 rounded-md transition-colors ${
            tool === 'eraser'
              ? 'bg-primary text-white dark:bg-primaryLight dark:text-gray-900'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Gomme"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.374-6.375a1.125 1.125 0 010-1.59L9.42 4.83a1.125 1.125 0 011.59 0l6.375 6.375a1.125 1.125 0 010 1.59L10.83 19.17a1.125 1.125 0 01-1.59 0z" />
          </svg>
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Brush sizes */}
      <div className="flex items-center gap-1">
        {BRUSH_SIZES.map((size) => (
          <button
            key={size}
            onClick={() => onBrushSizeChange(size)}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
              brushSize === size
                ? 'bg-primary/10 dark:bg-primaryLight/20 ring-1 ring-primary dark:ring-primaryLight'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title={`${size}px`}
          >
            <span
              className="rounded-full bg-current"
              style={{ width: Math.max(size, 3), height: Math.max(size, 3) }}
            />
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Colors */}
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => onColorChange(c.value)}
            className={`w-7 h-7 rounded-full border-2 transition-transform ${
              color === c.value
                ? 'border-primary dark:border-primaryLight scale-110'
                : 'border-gray-300 dark:border-gray-600 hover:scale-105'
            }`}
            style={{ backgroundColor: c.value }}
            title={c.label}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          title="Annuler (Ctrl+Z)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          title="Rétablir (Ctrl+Y)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
          </svg>
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Grid toggle */}
      <button
        onClick={onToggleGrid}
        className={`p-2 rounded-md transition-colors ${
          showGrid
            ? 'bg-primary/10 text-primary dark:bg-primaryLight/20 dark:text-primaryLight'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title="Grille"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      </button>

      {/* Reference image toggle (if available) */}
      {hasReference && (
        <>
          <button
            onClick={onToggleReference}
            className={`p-2 rounded-md transition-colors ${
              showReference
                ? 'bg-primary/10 text-primary dark:bg-primaryLight/20 dark:text-primaryLight'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Image de référence"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {showReference && (
            <input
              type="range"
              min={10}
              max={80}
              value={referenceOpacity}
              onChange={(e) => onReferenceOpacityChange(Number(e.target.value))}
              className="w-20 accent-primary dark:accent-primaryLight"
              title={`Opacité : ${referenceOpacity}%`}
            />
          )}
        </>
      )}

      <div className="flex-1" />

      {/* Clear */}
      <button
        onClick={handleClear}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          confirmClear
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        }`}
      >
        {confirmClear ? 'Confirmer ?' : 'Effacer tout'}
      </button>
    </div>
  )
}
