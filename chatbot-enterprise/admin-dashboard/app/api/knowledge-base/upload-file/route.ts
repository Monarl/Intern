import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/server';
import { getUserRole } from '@/app/lib/supabase/user-roles';

// Max file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const knowledgeBaseName = formData.get('knowledgeBaseName') as string;
    const knowledgeBaseId = formData.get('knowledgeBaseId') as string;
    
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

    // Validate file
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds the 20MB size limit' }, { status: 400 });
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not supported' }, { status: 400 });
    }

    // Knowledge Base logic
    let kb;
    if (knowledgeBaseId) {
      // Use existing KB
      const { data, error: kbError } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('id', knowledgeBaseId)
        .single();

      if (kbError) {
        return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 });
      }
      kb = data;
    } else {
      // Create new KB
      if (!knowledgeBaseName || knowledgeBaseName.trim() === '') {
        return NextResponse.json({ error: 'Knowledge base name is required' }, { status: 400 });
      }

      const { data, error: kbError } = await supabase
        .from('knowledge_bases')
        .upsert(
          { 
            name: knowledgeBaseName,
            owner_id: user.id
          },
          { onConflict: 'name' }
        )
        .select();

      if (kbError) {
        return NextResponse.json({ error: `Failed to create knowledge base: ${kbError.message}` }, { status: 500 });
      }

      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Failed to create knowledge base' }, { status: 500 });
      }

      kb = data[0];
    }

    // File upload
    const desiredPath = `${kb.name}/${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chatbot-documents')
      .upload(desiredPath, file);

    if (uploadError) {
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 });
    }

    // Get actual path and filename
    const actualPath = uploadData.path;
    const actualFilename = actualPath.split('/').pop() || file.name;

    // Create document record
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        knowledge_base_id: kb.id,
        title: actualFilename,
        file_path: actualPath,
        file_type: file.type,
        status: 'processing'
      })
      .select();

    if (documentError) {
      // Attempt to delete the uploaded file if document record creation fails
      await supabase.storage
        .from('chatbot-documents')
        .remove([actualPath]);
        
      return NextResponse.json({ error: `Failed to create document record: ${documentError.message}` }, { status: 500 });
    }

    // Trigger n8n webhook
    try {
      const response = await fetch('http://localhost:5678/webhook/upload-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: actualPath,
          file_name: actualFilename,
          knowledge_base_id: kb.id
        })
      });

      if (!response.ok) {
        // Log error but don't fail the request
        console.error('Failed to trigger n8n webhook:', await response.text());
      }
    } catch (webhookError) {
      console.error('Error triggering n8n webhook:', webhookError);
    }

    return NextResponse.json({
      success: true,
      document: documentData?.[0],
      knowledgeBase: kb
    });
    
  } catch (error) {
    console.error('Error processing file upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
