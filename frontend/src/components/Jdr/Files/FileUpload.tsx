import React from 'react'
import api from '../api'

interface FileUploadProps {
  folderId: number
  onUploadComplete: () => void
}

export default function FileUpload({ folderId, onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState('')
  const [successMsg, setSuccessMsg] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setUploading(true)
    setProgress(0)
    setError('')
    setSuccessMsg('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      await api.post(`/files/folders/${folderId}/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
          }
        },
      })
      setSuccessMsg(`"${file.name}" uploaded.`)
      setProgress(100)
      onUploadComplete()
    } catch {
      setError('Erreur lors de l\'upload.')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void uploadFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void uploadFile(file)
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
        ${isDragging
          ? 'border-primary bg-primary/5 dark:border-primaryLight dark:bg-primaryLight/5'
          : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      <svg className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>

      {uploading ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Upload en cours...</p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary dark:bg-primaryLight h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">{progress}%</p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Glissez-déposez un fichier ici
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-outline text-sm"
          >
            Parcourir
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {successMsg && <p className="mt-2 text-xs text-green-600 dark:text-green-400">{successMsg}</p>}
    </div>
  )
}
