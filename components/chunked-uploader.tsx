"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload } from "lucide-react"
import { Input } from "@/components/ui/input"

interface ChunkedUploaderProps {
  onFileSelected: (file: File | null) => void
  onProgressUpdate: (progress: number) => void
  maxSize?: number
  accept?: string
}

export default function ChunkedUploader({
  onFileSelected,
  onProgressUpdate,
  maxSize = 2 * 1024 * 1024 * 1024, // 2GB default
  accept = "video/*",
}: ChunkedUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      validateAndProcessFile(file)
    }
  }

  const validateAndProcessFile = (file: File) => {
    // Check file size
    if (file.size > maxSize) {
      alert(`File is too large. Maximum size is ${formatFileSize(maxSize)}.`)
      return
    }

    // For this demo, we'll simulate chunked upload with progress
    onFileSelected(file)
    simulateChunkedUpload(file)
  }

  const simulateChunkedUpload = (file: File) => {
    // In a real implementation, you would:
    // 1. Split the file into chunks (e.g., 5MB each)
    // 2. Upload each chunk with a unique identifier
    // 3. Reassemble on the server

    // For this demo, we'll simulate progress
    let progress = 0
    const totalChunks = Math.ceil(file.size / (5 * 1024 * 1024)) // 5MB chunks
    const interval = setInterval(() => {
      progress += 100 / totalChunks
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
      }
      onProgressUpdate(progress)
    }, 500)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0])
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB"
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB"
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB"
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-gray-300"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
        <label
          htmlFor="file-upload"
          className="relative cursor-pointer rounded-md bg-white font-semibold text-primary hover:text-primary/80"
        >
          <span>Upload a file</span>
          <Input
            id="file-upload"
            name="file-upload"
            type="file"
            className="sr-only"
            accept={accept}
            onChange={handleFileChange}
            ref={fileInputRef}
          />
        </label>
        <p className="pl-1">or drag and drop</p>
      </div>
      <p className="text-xs leading-5 text-gray-600 mt-2">MP4, MOV, or WebM up to {formatFileSize(maxSize)}</p>
    </div>
  )
}
