import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-app';
import { createAdminClient } from '@/app/lib/supabase/server';
import { getUserRole } from '@/app/lib/supabase/user-roles';

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function checkIsSitemap(url: string): boolean {
  // Basic check - more robust validation could be done
  return url.toLowerCase().includes('.xml') || url.toLowerCase().includes('sitemap');
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { url, knowledgeBaseName, knowledgeBaseId, isSitemap } = json;

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

    // Validate URL
    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // If marked as sitemap, do basic validation
    if (isSitemap && !checkIsSitemap(url)) {
      return NextResponse.json({ error: 'URL does not appear to be a sitemap' }, { status: 400 });
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

    // Create document record for the URL
    const { data: documentData, error: documentError } = await adminSupabase
      .from('documents')
      .insert({
        knowledge_base_id: kb.id,
        title: url,
        file_path: null, // No file path for URLs
        file_type: isSitemap ? 'sitemap' : 'url',
        status: 'processing',
        metadata: {
          url: url,
          is_sitemap: !!isSitemap
        }
      })
      .select();

    if (documentError) {
      return NextResponse.json({ error: `Failed to create document record: ${documentError.message}` }, { status: 500 });
    }

    // Trigger n8n webhook
    try {
      const response = await fetch('http://localhost:5678/webhook/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: "",
          file_name: url,
          knowledge_base_id: kb.id,
          is_sitemap: !!isSitemap
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
    console.error('Error processing URL upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
