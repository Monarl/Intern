import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-app';
import { createAdminClient } from '@/app/lib/supabase/server';
import { getUserRole } from '@/app/lib/supabase/user-roles';

// Helper function to sanitize names for storage paths
function sanitizeForStorage(name: string): string {
  return name
    .normalize('NFD') // Normalize Unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\-_.]/g, '-') // Replace invalid characters with hyphens (using \w for better Unicode support)
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .toLowerCase();
}

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
      const { data, error: kbError } = await adminSupabase
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

      const { data, error: kbError } = await adminSupabase
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
    const sanitizedKbName = sanitizeForStorage(kb.name);
    const sanitizedFileName = sanitizeForStorage(file.name);
    const desiredPath = `${sanitizedKbName}/${sanitizedFileName}`;
    
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('chatbot-documents')
      .upload(desiredPath, file);

    if (uploadError) {
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 });
    }

    // Get actual path
    const actualPath = uploadData.path;

    // Trigger n8n webhook for document processing
    try {
      const response = await fetch('http://localhost:5678/webhook/upload-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: actualPath,
          file_name: file.name, // Use original filename for n8n processing
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
      message: 'File uploaded successfully and processing started',
      filePath: actualPath,
      knowledgeBase: kb
    });
    
  } catch (error) {
    console.error('Error processing file upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
