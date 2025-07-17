'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Trash2, FileText, Globe, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useSupabase } from '@/lib/supabase/context'

interface Document {
  id: string
  title: string
  file_type: string
  file_path: string | null
  status: string
  created_at: string
  metadata: Record<string, unknown>
}

interface KnowledgeBase {
  id: string
  name: string
  description: string | null
}

interface ApiError {
  error: string
  message?: string
}

export default function DocumentsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { userRole, isLoading: userLoading } = useSupabase()
  // In client components, params is already resolved
  const id = params.id
  const [loading, setLoading] = useState(true)
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  
  const fetchData = useCallback(async () => {
    // Skip API call if user doesn't have permission
    if (userRole !== 'Super Admin' && userRole !== 'Knowledge Manager') {
      setLoading(false)
      return
    }
    
    if (userLoading) {
      return; // Wait until user role is loaded
    }
    
    console.log('Fetching data with role:', userRole);
    
    setLoading(true)
    try {
      // Use the API to get both KB and documents with proper auth
      const response = await fetch(`/api/knowledge-base/documents/${id}`, {
        method: 'GET',
        credentials: 'include', // Include credentials for auth
        cache: 'no-store', // Prevent caching
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json() as ApiError;
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch documents');
      }
      
      const data = await response.json();
      console.log('Data received:', data);
      setKnowledgeBase(data.knowledgeBase);
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [id, userRole, userLoading])
  
  useEffect(() => {
    // Only fetch data once the user role is loaded
    if (!userLoading && (userRole === 'Super Admin' || userRole === 'Knowledge Manager')) {
      console.log('User role loaded:', userRole);
      fetchData();
    }
  }, [fetchData, userLoading, userRole])
  
  async function handleDeleteDocument(document: Document) {
    if (!confirm(`Are you sure you want to delete "${document.title}"?`)) return
    
    try {
      const response = await fetch(`/api/knowledge-base/document/${document.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        const error = await response.json() as ApiError
        throw new Error(error.error || 'Failed to delete document')
      }
      
      toast.success(`Document "${document.title}" deleted`)
      fetchData() // Refresh the list
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete document')
    }
  }
  
  function getDocumentIcon(document: Document) {
    return document.file_path ? <FileText className="h-5 w-5" /> : <Globe className="h-5 w-5" />
  }
  
  function getDocumentTypeLabel(document: Document) {
    if (document.file_type === 'sitemap') return 'Sitemap'
    if (document.file_type === 'url') return 'URL'
    return document.file_type?.toUpperCase() || 'Unknown'
  }
  
  function getStatusColor(status: string) {
    switch (status) {
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Access control - only Super Admin and Knowledge Manager can view this page
  const hasPermission = userRole === 'Super Admin' || userRole === 'Knowledge Manager';
  
  // Show loading state while checking permissions
  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/dashboard')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="h-9 w-40">
            <Skeleton className="h-9 w-40" />
          </div>
        </div>
        <Card className="w-full p-12">
          <CardContent className="flex flex-col items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Show unauthorized message if user doesn't have permission
  if (!hasPermission) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/dashboard')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Unauthorized Access
          </h1>
        </div>
        <Card className="w-full p-12 text-center">
          <CardContent className="flex flex-col items-center gap-4">
            <ShieldAlert className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">
              You don&apos;t have permission to view this knowledge base.
              Only Super Admin and Knowledge Manager roles can access this page.
            </p>
            <Button 
              onClick={() => router.push('/dashboard')}
              className="mt-4"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/dashboard/knowledge-bases')}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        {loading ? (
          <div className="h-9 w-40">
            <Skeleton className="h-9 w-40" />
          </div>
        ) : (
          <h1 className="text-3xl font-bold tracking-tight">
            {knowledgeBase?.name}
          </h1>
        )}
      </div>
      
      <div className="flex justify-between items-center">
        {loading ? (
          <div className="text-muted-foreground">
            <Skeleton className="h-6 w-60" />
          </div>
        ) : (
          <div className="text-muted-foreground">
            {`${documents.length} document${documents.length !== 1 ? 's' : ''}`}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-16" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="w-full p-12 text-center">
          <CardContent>
            <p className="text-muted-foreground">No documents found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div className="flex items-center gap-2">
                  {getDocumentIcon(doc)}
                  <div>
                    <h3 className="font-medium">{doc.title}</h3>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(doc.status)}`}>
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </div>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-sm text-muted-foreground">
                  Type: {getDocumentTypeLabel(doc)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Added: {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="flex justify-end py-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-500"
                  onClick={() => handleDeleteDocument(doc)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
