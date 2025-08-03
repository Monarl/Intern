'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface KnowledgeBase {
  id: string
  name: string
  description: string | null
  created_at: string
  owner_id: string
  documents: { count: number }
}

interface BulkDeleteKnowledgeBasesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeBases: KnowledgeBase[]
  onConfirm: () => Promise<void>
}

export default function BulkDeleteKnowledgeBasesDialog({
  open,
  onOpenChange,
  knowledgeBases,
  onConfirm
}: BulkDeleteKnowledgeBasesDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  
  const handleConfirm = async () => {
    setIsDeleting(true)
    await onConfirm()
    setIsDeleting(false)
  }

  const totalDocuments = knowledgeBases.reduce((sum, kb) => sum + kb.documents.count, 0)
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (isDeleting) return // Prevent closing during deletion
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete {knowledgeBases.length} Knowledge Base{knowledgeBases.length === 1 ? '' : 's'}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the selected knowledge bases?
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
                  <li>• {knowledgeBases.length} knowledge base{knowledgeBases.length === 1 ? '' : 's'}</li>
                  <li>• {totalDocuments} document{totalDocuments === 1 ? '' : 's'} and their content</li>
                  <li>• All vector embeddings and related data</li>
                  <li>• All uploaded files from storage</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Knowledge bases to be deleted:</p>
            <div className="max-h-32 overflow-y-auto border rounded-md p-2">
              {knowledgeBases.map((kb) => (
                <div key={kb.id} className="flex justify-between items-center py-1 text-sm">
                  <span className="font-medium">{kb.name}</span>
                  <span className="text-muted-foreground">
                    {kb.documents.count} doc{kb.documents.count === 1 ? '' : 's'}
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
