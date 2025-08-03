import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/server'
import { createClient } from '@/lib/supabase/server-app'
import { getUserRole } from '@/app/lib/supabase/user-roles'

const ALLOWED_ROLES = ['Super Admin', 'Knowledge Manager']

export async function DELETE(request: NextRequest) {
  try {
    const adminSupabase = await createAdminClient()
    const userSupabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const userRole = await getUserRole(user.id)
    if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body
    const { 
      document_ids: documentIds, 
      knowledge_base_id: knowledgeBaseId 
    }: { 
      document_ids: string[], 
      knowledge_base_id?: string 
    } = await request.json()

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'Invalid document IDs' }, { status: 400 })
    }

    // Validate that all IDs are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    for (const id of documentIds) {
      if (!uuidRegex.test(id)) {
        return NextResponse.json({ error: `Invalid UUID format: ${id}` }, { status: 400 })
      }
    }

    // Get documents to be deleted (for cleanup and validation)
    const { data: documents, error: docError } = await adminSupabase
      .from('documents')
      .select(`
        id, 
        title, 
        file_path,
        status,
        knowledge_base_id,
        knowledge_bases!inner(name)
      `)
      .in('id', documentIds)

    if (docError) {
      return NextResponse.json({ error: `Failed to fetch documents: ${docError.message}` }, { status: 500 })
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: 'No documents found' }, { status: 404 })
    }

    // Check if any documents are still processing
    const processingDocs = documents.filter(doc => doc.status === 'processing')
    if (processingDocs.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete ${processingDocs.length} document(s) that are still being processed. Please wait for processing to complete.`,
        processingDocuments: processingDocs.map(doc => ({ id: doc.id, title: doc.title }))
      }, { status: 409 })
    }

    // Validate that all documents belong to the specified knowledge base (if provided)
    if (knowledgeBaseId) {
      const invalidDocs = documents.filter(doc => doc.knowledge_base_id !== knowledgeBaseId)
      if (invalidDocs.length > 0) {
        return NextResponse.json({ 
          error: `Some documents do not belong to the specified knowledge base`,
          invalidDocuments: invalidDocs.map(doc => ({ id: doc.id, title: doc.title }))
        }, { status: 400 })
      }
    }

    // Clean up storage files for documents that have file_path
    const deletionResults = []
    for (const doc of documents) {
      try {
        let fileDeleted = false
        
        if (doc.file_path) {
          // This is a file-based document, delete from storage
          const { error: deleteError } = await adminSupabase.storage
            .from('chatbot-documents')
            .remove([doc.file_path])

          if (deleteError) {
            console.warn(`Warning: Could not delete file ${doc.file_path}:`, deleteError.message)
          } else {
            fileDeleted = true
          }
        }

        deletionResults.push({
          id: doc.id,
          title: doc.title,
          fileDeleted,
          success: true
        })
      } catch (error) {
        console.error(`Error cleaning up file for document ${doc.title}:`, error)
        deletionResults.push({
          id: doc.id,
          title: doc.title,
          fileDeleted: false,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Delete documents (this will cascade delete document_chunks)
    const { error: deleteDocError } = await adminSupabase
      .from('documents')
      .delete()
      .in('id', documentIds)

    if (deleteDocError) {
      return NextResponse.json({ 
        error: `Failed to delete documents: ${deleteDocError.message}`,
        partialResults: deletionResults
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully deleted ${documents.length} document(s)`,
      results: deletionResults
    })

  } catch (error) {
    console.error('Bulk delete documents error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
