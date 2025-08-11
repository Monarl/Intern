'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2, AlertTriangle, FileText, Globe } from 'lucide-react'

interface Document {
  id: string
  title: string
  file_type: string
  file_path: string | null
  status: string
  created_at: string
  metadata: Record<string, unknown>
}

interface BulkDeleteDocumentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documents: Document[]
  onConfirm: () => Promise<void>
}

export default function BulkDeleteDocumentsDialog({
  open,
  onOpenChange,
  documents,
  onConfirm
}: BulkDeleteDocumentsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  
  const handleConfirm = async () => {
    setIsDeleting(true)
    await onConfirm()
    setIsDeleting(false)
  }

  const fileDocuments = documents.filter(doc => doc.file_path)
  
  function getDocumentIcon(document: Document) {
    return document.file_path ? <FileText className="h-4 w-4" /> : <Globe className="h-4 w-4" />
  }

  function getDocumentTypeLabel(document: Document) {
    if (document.file_type === 'sitemap') return 'Sitemap'
    if (document.file_type === 'url') return 'URL'
    return document.file_type?.toUpperCase() || 'Unknown'
  }
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (isDeleting) return // Prevent closing during deletion
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete {documents.length} Document{documents.length === 1 ? '' : 's'}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the selected documents?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-800">
                  This action will permanently delete:
                </p>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• {documents.length} document{documents.length === 1 ? '' : 's'}</li>
                  {fileDocuments.length > 0 && (
                    <li>• {fileDocuments.length} uploaded file{fileDocuments.length === 1 ? '' : 's'} from storage</li>
                  )}
                  <li>• All vector embeddings and text chunks</li>
                  <li>• All related metadata</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Documents to be deleted:</p>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 py-1 text-sm">
                  {getDocumentIcon(doc)}
                  <span className="flex-1 font-medium truncate">{doc.title}</span>
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                    {getDocumentTypeLabel(doc)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-medium">
            This action cannot be undone.
          </p>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete All'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
