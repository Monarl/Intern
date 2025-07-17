'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { FileUp, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

// Types
interface KnowledgeBase {
  id: string
  name: string
}

interface FileUploadStatus {
  id: string
  name: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  file: File
}

interface UploadFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeBase: KnowledgeBase | null
  onUploaded: () => void
}

export default function UploadFileDialog({
  open,
  onOpenChange,
  knowledgeBase,
  onUploaded
}: UploadFileDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [files, setFiles] = useState<FileUploadStatus[]>([])
  
  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (!isOpen) {
      setFiles([])
      setIsUploading(false)
      // Reset the file input when dialog closes
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    // Convert FileList to Array and initialize upload status for each
    const newFiles = Array.from(e.target.files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      progress: 0,
      status: 'pending' as const,
      file
    }))
    
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id))
  }

  const uploadFiles = async () => {
    if (!knowledgeBase) {
      toast.error('No knowledge base selected')
      return
    }
    
    if (files.length === 0) {
      toast.error('Please select at least one file')
      return
    }
    
    setIsUploading(true)
    
    // Upload each file individually
    for (const fileItem of files.filter(f => f.status === 'pending')) {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: 'uploading' } : f
      ))
      
      try {
        const formData = new FormData()
        formData.append('file', fileItem.file)
        formData.append('knowledgeBaseId', knowledgeBase.id)
        
        const response = await fetch('/api/knowledge-base/upload-file', {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }
        
        // Update status to success
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f
        ))
        
      } catch (error) {
        console.error(`Error uploading file ${fileItem.name}:`, error)
        
        // Update status to error
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' } : f
        ))
      }
    }
    
    // All files processed
    setIsUploading(false)
    
    // If at least one file uploaded successfully
    if (files.some(f => f.status === 'success')) {
      toast.success('Files uploaded successfully')
      onUploaded()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <div className="w-5 h-5" />
      case 'uploading':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload files to the knowledge base: {knowledgeBase?.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="file-upload">Select Files</Label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.docx,.xlsx,.csv"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <FileUp className="mr-2 h-4 w-4" />
                Choose Files
              </Button>
              <div className="text-xs text-muted-foreground flex items-center">
                Supports PDF, DOCX, XLSX, CSV (max 20MB each)
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-sm font-medium">
                Selected Files
              </div>
              <div className="divide-y">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between py-2 px-4">
                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                      {getStatusIcon(file.status)}
                      <span className="truncate">{file.name}</span>
                    </div>
                    
                    {file.status === 'error' ? (
                      <div className="text-xs text-red-500 truncate max-w-[20%]" title={file.error}>
                        {file.error}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        {file.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeFile(file.id)}
                            disabled={isUploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={uploadFiles} disabled={isUploading || files.length === 0}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
