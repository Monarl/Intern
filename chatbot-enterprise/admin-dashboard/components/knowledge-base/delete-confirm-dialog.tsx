'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { useState } from 'react'

// Types
interface KnowledgeBase {
  id: string
  name: string
}

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeBase: KnowledgeBase | null
  onConfirm: () => void
}

export default function DeleteConfirmDialog({
  open,
  onOpenChange,
  knowledgeBase,
  onConfirm
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  
  const handleConfirm = async () => {
    setIsDeleting(true)
    await onConfirm()
    setIsDeleting(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (isDeleting) return // Prevent closing during deletion
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete Knowledge Base
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{knowledgeBase?.name}&quot;?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This will permanently delete the knowledge base, all its documents, and related data. This action cannot be undone.
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
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
