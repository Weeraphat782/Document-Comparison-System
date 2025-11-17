"use client"

import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, File, X, CheckCircle, AlertCircle, FileText, Image, FileSpreadsheet } from "lucide-react"
import { UploadedDocument } from "@/lib/types"
import { toast } from "sonner"

interface FileUploaderProps {
  groupId: string
  onUploadComplete?: (documents: UploadedDocument[]) => void
  maxFiles?: number
  maxFileSize?: number // in MB
}

interface UploadProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  document?: UploadedDocument
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv',
  '.jpg', '.jpeg', '.png', '.gif', '.webp'
]

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <Image className="h-4 w-4" />
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-4 w-4" />
  }
  return <FileText className="h-4 w-4" />
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function FileUploader({
  groupId,
  onUploadComplete,
  maxFiles = 10,
  maxFileSize = 10
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      // Also check extension as fallback
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return 'File type not supported. Supported types: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, JPG, PNG, GIF, WebP'
      }
    }

    return null
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)

    if (fileArray.length === 0) return

    if (uploads.length + fileArray.length > maxFiles) {
      toast.error(`Cannot upload more than ${maxFiles} files at once`)
      return
    }

    // Validate files
    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    }

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
    }

    if (validFiles.length === 0) return

    // Add to upload queue
    const newUploads: UploadProgress[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }))

    setUploads(prev => [...prev, ...newUploads])

    // Start uploading
    setIsUploading(true)
    await uploadFiles(newUploads)
    setIsUploading(false)
  }, [uploads.length, maxFiles])

  const uploadFiles = async (uploadList: UploadProgress[]) => {
    const completedUploads: UploadedDocument[] = []

    for (const upload of uploadList) {
      try {
        // Update status to uploading
        setUploads(prev => prev.map(u =>
          u.file === upload.file ? { ...u, status: 'uploading' as const } : u
        ))

        const formData = new FormData()
        formData.append('file', upload.file)
        formData.append('group_id', groupId)

        const xhr = new XMLHttpRequest()

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploads(prev => prev.map(u =>
              u.file === upload.file ? { ...u, progress } : u
            ))
          }
        })

        // Handle completion
        const uploadPromise = new Promise<UploadedDocument>((resolve, reject) => {
          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              try {
                const response = JSON.parse(xhr.responseText)
                resolve(response.document)
              } catch (e) {
                reject(new Error('Invalid response format'))
              }
            } else {
              try {
                const error = JSON.parse(xhr.responseText)
                reject(new Error(error.error || 'Upload failed'))
              } catch (e) {
                reject(new Error('Upload failed'))
              }
            }
          })

          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'))
          })
        })

        xhr.open('POST', '/api/documents/upload')
        xhr.send(formData)

        const document = await uploadPromise

        // Update status to completed
        setUploads(prev => prev.map(u =>
          u.file === upload.file ? {
            ...u,
            status: 'completed' as const,
            progress: 100,
            document
          } : u
        ))

        completedUploads.push(document)
        toast.success(`${upload.file.name} uploaded successfully`)

      } catch (error) {
        console.error('Upload error:', error)

        // Update status to error
        setUploads(prev => prev.map(u =>
          u.file === upload.file ? {
            ...u,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Upload failed'
          } : u
        ))

        toast.error(`Failed to upload ${upload.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (completedUploads.length > 0 && onUploadComplete) {
      onUploadComplete(completedUploads)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [handleFiles])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeUpload = (file: File) => {
    setUploads(prev => prev.filter(u => u.file !== file))
  }

  const clearCompleted = () => {
    setUploads(prev => prev.filter(u => u.status !== 'completed'))
  }

  const hasCompletedUploads = uploads.some(u => u.status === 'completed')
  const hasPendingUploads = uploads.some(u => u.status === 'pending' || u.status === 'uploading')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Drag and drop files here or click to browse. Maximum {maxFiles} files, {maxFileSize}MB each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Upload Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
            </h3>
            <p className="text-muted-foreground mb-4">
              or click to browse your files
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_EXTENSIONS.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Supported Formats */}
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Supported formats:</p>
            <div className="flex flex-wrap gap-2">
              {['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'TXT', 'CSV', 'JPG', 'PNG', 'GIF', 'WebP'].map(format => (
                <Badge key={format} variant="secondary" className="text-xs">
                  {format}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Upload Progress</CardTitle>
              {hasCompletedUploads && (
                <Button variant="outline" size="sm" onClick={clearCompleted}>
                  Clear Completed
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploads.map((upload, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getFileIcon(upload.file.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{upload.file.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(upload.file.size)}
                        </span>

                        {upload.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {upload.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        {upload.status !== 'completed' && upload.status !== 'error' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUpload(upload.file)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {upload.status === 'uploading' && (
                      <Progress value={upload.progress} className="h-2" />
                    )}

                    {upload.status === 'error' && upload.error && (
                      <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                    )}

                    {upload.status === 'completed' && upload.document && (
                      <p className="text-xs text-green-600 mt-1">
                        Uploaded successfully
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Summary */}
      {hasCompletedUploads && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ✓ {uploads.filter(u => u.status === 'completed').length} of {uploads.length} files uploaded successfully!
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}


