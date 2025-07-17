'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Trash2, FileUp, Globe, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import NewKnowledgeBaseDialog from '@/components/knowledge-base/new-knowledge-base-dialog'
import UploadFileDialog from '@/components/knowledge-base/upload-file-dialog'
import UploadUrlDialog from '@/components/knowledge-base/upload-url-dialog'
import DeleteConfirmDialog from '@/components/knowledge-base/delete-confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useSupabase } from '@/lib/supabase/context'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface KnowledgeBase {
  id: string
  name: string
  description: string | null
  created_at: string
  owner_id: string
  documents: { count: number }
}

export default function KnowledgeBasesPage() {
  const router = useRouter()
  const { userRole, isLoading: userLoading } = useSupabase()
  const [loading, setLoading] = useState(true)
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  
  // Dialog state
  const [newKbDialogOpen, setNewKbDialogOpen] = useState(false)
  const [uploadFileDialogOpen, setUploadFileDialogOpen] = useState(false)
  const [uploadUrlDialogOpen, setUploadUrlDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null)

  const fetchKnowledgeBases = useCallback(async () => {
    // Double check permissions before making API call
    if (userRole !== 'Super Admin' && userRole !== 'Knowledge Manager') {
      return
    }
    
    setLoading(true)
    try {
      console.log('Fetching knowledge bases with role:', userRole);
      
      // Add refresh cache parameter to avoid stale responses
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/knowledge-base/list?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add Cache-Control header to prevent caching
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include', // Include credentials for auth
        cache: 'no-store' // Prevent caching
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API error response:', errorData);
        if (response.status === 401) {
          toast.error('Authentication error. Please refresh the page or log in again.');
        } else {
          throw new Error(`Failed to fetch knowledge bases: ${errorData.error || 'Unknown error'}`);
        }
        return;
      }
      
      const data = await response.json();
      console.log('Knowledge bases received:', data);
      setKnowledgeBases(data.knowledgeBases || []);
    } catch (error) {
      console.error('Error fetching knowledge bases:', error);
      toast.error('Failed to load knowledge bases');
    } finally {
      setLoading(false);
    }
  }, [userRole])

  useEffect(() => {
    // Only fetch data if user has the right permissions
    if (!userLoading && (userRole === 'Super Admin' || userRole === 'Knowledge Manager')) {
      fetchKnowledgeBases()
    }
  }, [userLoading, userRole, fetchKnowledgeBases])

  async function handleDeleteKnowledgeBase(kb: KnowledgeBase) {
    try {
      const response = await fetch(`/api/knowledge-base/${kb.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete knowledge base')
      }
      
      toast.success(`Knowledge base "${kb.name}" deleted`)
      fetchKnowledgeBases() // Refresh the list
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error('Error deleting knowledge base:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete knowledge base')
    }
  }

  function openDeleteDialog(kb: KnowledgeBase) {
    setSelectedKb(kb)
    setDeleteDialogOpen(true)
  }

  function openUploadFileDialog(kb: KnowledgeBase) {
    setSelectedKb(kb)
    setUploadFileDialogOpen(true)
  }

  function openUploadUrlDialog(kb: KnowledgeBase) {
    setSelectedKb(kb)
    setUploadUrlDialogOpen(true)
  }

  function viewDocuments(kb: KnowledgeBase) {
    router.push(`/dashboard/knowledge-bases/${kb.id}`)
  }
  
  // Only Super Admin and Knowledge Manager should be able to access this page
  const hasPermission = userRole === 'Super Admin' || userRole === 'Knowledge Manager'

  // Show unauthorized access message if user doesn't have correct role
  if (!userLoading && !hasPermission) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Bases</h1>
        
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unauthorized Access</AlertTitle>
          <AlertDescription>
            You do not have permission to view this page. Only Super Admins and Knowledge Managers can access Knowledge Bases.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Bases</h1>
        <Button onClick={() => setNewKbDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Knowledge Base
        </Button>
      </div>
      
      <p className="text-muted-foreground">
        Create and manage knowledge sources for your chatbots.
      </p>

      {userLoading || loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-64">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : knowledgeBases.length === 0 ? (
        <Card className="w-full p-12 text-center">
          <CardContent>
            <p className="text-muted-foreground mb-4">No knowledge bases found</p>
            <Button onClick={() => setNewKbDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create your first knowledge base
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {knowledgeBases.map((kb) => (
            <Card key={kb.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="truncate">{kb.name}</CardTitle>
                <CardDescription>
                  {kb.documents?.count} document{kb.documents?.count !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {kb.description || 'No description'}
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Created: {new Date(kb.created_at).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between p-4 bg-slate-50 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => viewDocuments(kb)}
                >
                  View Documents
                </Button>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    title="Upload Files"
                    onClick={() => openUploadFileDialog(kb)}
                  >
                    <FileUp className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    title="Add URL"
                    onClick={() => openUploadUrlDialog(kb)}
                  >
                    <Globe className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500"
                    title="Delete Knowledge Base"
                    onClick={() => openDeleteDialog(kb)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <NewKnowledgeBaseDialog
        open={newKbDialogOpen}
        onOpenChange={setNewKbDialogOpen}
        onCreated={fetchKnowledgeBases}
      />

      <UploadFileDialog
        open={uploadFileDialogOpen}
        onOpenChange={setUploadFileDialogOpen}
        knowledgeBase={selectedKb}
        onUploaded={fetchKnowledgeBases}
      />

      <UploadUrlDialog
        open={uploadUrlDialogOpen}
        onOpenChange={setUploadUrlDialogOpen}
        knowledgeBase={selectedKb}
        onUploaded={fetchKnowledgeBases}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        knowledgeBase={selectedKb}
        onConfirm={() => selectedKb && handleDeleteKnowledgeBase(selectedKb)}
      />
    </div>
  )
}
