import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-app';
import { createAdminClient } from '@/app/lib/supabase/server';
import { getUserRole } from '@/app/lib/supabase/user-roles';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // User validation and authentication check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based access control using admin client for role lookup
    const adminSupabase = await createAdminClient();
    const userRole = await getUserRole(user.id);
    if (userRole !== 'Super Admin' && userRole !== 'Knowledge Manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // First, get the document to check if it's a file or URL
    const { data: document, error: documentError } = await adminSupabase
      .from('documents')
      .select('*, knowledge_bases(*)')
      .eq('id', documentId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if document is still processing
    if (document.status === 'processing') {
      return NextResponse.json({ 
        error: `Cannot delete document "${document.title}". Document is still being processed. Please wait for processing to complete.`
      }, { status: 409 });
    }

    // If document has a file_path, delete the storage object
    if (document.file_path) {
      const { error: storageError } = await adminSupabase
        .storage
        .from('chatbot-documents')
        .remove([document.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with document deletion even if storage deletion fails
      }
    }

    // Delete the document record - this will cascade delete related document_chunks
    // due to the foreign key constraints defined in the database schema
    const { error: deleteError } = await adminSupabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      return NextResponse.json({ error: `Failed to delete document: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Document deleted successfully',
      documentId
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
