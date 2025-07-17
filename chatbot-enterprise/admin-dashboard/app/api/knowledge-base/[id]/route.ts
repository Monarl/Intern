import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/server';
import { getUserRole } from '@/app/lib/supabase/user-roles';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const kbId = params.id;
    if (!kbId) {
      return NextResponse.json({ error: 'Knowledge base ID is required' }, { status: 400 });
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

    // Get the knowledge base to get its name
    const { data: kb, error: kbError } = await supabase
      .from('knowledge_bases')
      .select('*')
      .eq('id', kbId)
      .single();

    if (kbError || !kb) {
      return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 });
    }

    // Get all documents for this KB to delete their storage objects
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('knowledge_base_id', kbId);

    if (!documentsError && documents) {
      // Delete all storage objects for files in this KB
      const filePaths = documents
        .filter(doc => doc.file_path)
        .map(doc => doc.file_path);

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase
          .storage
          .from('chatbot-documents')
          .remove(filePaths);

        if (storageError) {
          console.error('Error deleting files from storage:', storageError);
          // Continue with KB deletion even if some storage deletions fail
        }
      }
    }

    // Delete the KB (this will cascade delete documents and document_chunks due to FK constraints)
    const { error: deleteError } = await supabase
      .from('knowledge_bases')
      .delete()
      .eq('id', kbId);

    if (deleteError) {
      return NextResponse.json({ error: `Failed to delete knowledge base: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Knowledge base and associated documents deleted successfully',
      knowledgeBaseId: kbId
    });

  } catch (error) {
    console.error('Error deleting knowledge base:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
