import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/server';
import { getUserRole } from '@/app/lib/supabase/user-roles';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // User validation and authentication check
    const supabase = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based access control
    const userRole = await getUserRole(user.id);
    if (userRole !== 'Super Admin' && userRole !== 'Knowledge Manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // First, get the document to check if it's a file or URL
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*, knowledge_bases(*)')
      .eq('id', documentId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // If document has a file_path, delete the storage object
    if (document.file_path) {
      const { error: storageError } = await supabase
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
    const { error: deleteError } = await supabase
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
