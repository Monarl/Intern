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
    const { knowledgeBaseIds }: { knowledgeBaseIds: string[] } = await request.json()

    if (!Array.isArray(knowledgeBaseIds) || knowledgeBaseIds.length === 0) {
      return NextResponse.json({ error: 'Invalid knowledge base IDs' }, { status: 400 })
    }

    // Validate that all IDs are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    for (const id of knowledgeBaseIds) {
      if (!uuidRegex.test(id)) {
        return NextResponse.json({ error: `Invalid UUID format: ${id}` }, { status: 400 })
      }
    }

    // Get knowledge bases to be deleted (for cleanup)
    const { data: knowledgeBases, error: kbError } = await adminSupabase
      .from('knowledge_bases')
      .select('id, name')
      .in('id', knowledgeBaseIds)

    if (kbError) {
      return NextResponse.json({ error: `Failed to fetch knowledge bases: ${kbError.message}` }, { status: 500 })
    }

    if (!knowledgeBases || knowledgeBases.length === 0) {
      return NextResponse.json({ error: 'No knowledge bases found' }, { status: 404 })
    }

    // Check if any knowledge bases have processing documents
    const { data: processingDocs, error: processingError } = await adminSupabase
      .from('documents')
      .select(`
        id, 
        title, 
        status, 
        knowledge_base_id,
        knowledge_bases!inner(name)
      `)
      .in('knowledge_base_id', knowledgeBaseIds)
      .eq('status', 'processing')

    if (processingError) {
      return NextResponse.json({ error: 'Failed to check document status' }, { status: 500 })
    }

    if (processingDocs && processingDocs.length > 0) {
      // Group processing documents by knowledge base
      const processingByKb = processingDocs.reduce((acc, doc) => {
        const kbId = doc.knowledge_base_id
        if (!acc[kbId]) {
          acc[kbId] = []
        }
        acc[kbId].push(doc)
        return acc
      }, {} as Record<string, typeof processingDocs>)

      const affectedKbs = Object.keys(processingByKb)
      const totalProcessingDocs = processingDocs.length

      return NextResponse.json({ 
        error: `Cannot delete ${affectedKbs.length} knowledge base(s) with ${totalProcessingDocs} document(s) still being processed. Please wait for processing to complete.`,
        processingDocuments: processingDocs.map(doc => ({ 
          id: doc.id, 
          title: doc.title, 
          knowledgeBaseId: doc.knowledge_base_id
        }))
      }, { status: 409 })
    }

    // Clean up storage files for each knowledge base
    const deletionResults = []
    
    // Get all documents for the knowledge bases to delete their storage objects
    const { data: allDocuments, error: documentsError } = await adminSupabase
      .from('documents')
      .select('file_path, knowledge_base_id')
      .in('knowledge_base_id', knowledgeBaseIds)

    if (documentsError) {
      console.warn('Warning: Could not fetch documents for storage cleanup:', documentsError.message)
    }

    // Group documents by knowledge base for detailed results
    const documentsByKb = (allDocuments || []).reduce((acc, doc) => {
      const kbId = doc.knowledge_base_id
      if (!acc[kbId]) {
        acc[kbId] = []
      }
      if (doc.file_path) {
        acc[kbId].push(doc.file_path)
      }
      return acc
    }, {} as Record<string, string[]>)

    for (const kb of knowledgeBases) {
      try {
        const filePaths = documentsByKb[kb.id] || []
        let filesDeleted = 0

        if (filePaths.length > 0) {
          const { error: deleteError } = await adminSupabase.storage
            .from('chatbot-documents')
            .remove(filePaths)

          if (deleteError) {
            console.warn(`Warning: Some files could not be deleted for KB ${kb.name}:`, deleteError.message)
          } else {
            filesDeleted = filePaths.length
          }
        }

        deletionResults.push({
          id: kb.id,
          name: kb.name,
          filesDeleted,
          success: true
        })
      } catch (error) {
        console.error(`Error cleaning up files for KB ${kb.name}:`, error)
        deletionResults.push({
          id: kb.id,
          name: kb.name,
          filesDeleted: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Delete knowledge bases (this will cascade delete documents and document_chunks)
    const { error: deleteKbError } = await adminSupabase
      .from('knowledge_bases')
      .delete()
      .in('id', knowledgeBaseIds)

    if (deleteKbError) {
      return NextResponse.json({ 
        error: `Failed to delete knowledge bases: ${deleteKbError.message}`,
        partialResults: deletionResults
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully deleted ${knowledgeBases.length} knowledge base(s)`,
      results: deletionResults
    })

  } catch (error) {
    console.error('Bulk delete knowledge bases error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
