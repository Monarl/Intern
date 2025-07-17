'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '../ui/checkbox'
import { toast } from 'sonner'
import { Globe, Loader2 } from 'lucide-react'

// Types
interface KnowledgeBase {
  id: string
  name: string
}

interface UploadUrlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeBase: KnowledgeBase | null
  onUploaded: () => void
}

export default function UploadUrlDialog({
  open,
  onOpenChange,
  knowledgeBase,
  onUploaded
}: UploadUrlDialogProps) {
  const [url, setUrl] = useState('')
  const [isSitemap, setIsSitemap] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  function resetForm() {
    setUrl('')
    setIsSitemap(false)
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!knowledgeBase) {
      toast.error('No knowledge base selected')
      return
    }
    
    if (!url.trim()) {
      toast.error('URL is required')
      return
    }
    
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/knowledge-base/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url.trim(),
          knowledgeBaseId: knowledgeBase.id,
          isSitemap
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload URL')
      }
      
      toast.success(`URL ${isSitemap ? '(sitemap)' : ''} added successfully`)
      onUploaded()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Error uploading URL:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload URL')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add URL</DialogTitle>
            <DialogDescription>
              Add a URL or sitemap to the knowledge base: {knowledgeBase?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="sitemap" 
                checked={isSitemap} 
                onCheckedChange={(checked: boolean | "indeterminate") => setIsSitemap(checked === true)}
                disabled={isSubmitting}
              />
              <Label 
                htmlFor="sitemap" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                This URL is a sitemap
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Add URL
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
