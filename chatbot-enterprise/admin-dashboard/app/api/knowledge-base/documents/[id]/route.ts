import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-app';
import { createAdminClient } from '@/app/lib/supabase/server';
import { getUserRole } from '@/app/lib/supabase/user-roles';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: kbId } = await params;
    if (!kbId) {
      return NextResponse.json({ error: 'Knowledge base ID is required' }, { status: 400 });
    }

    // User validation and authentication check - use proper server client with cookies
    const clientSupabase = await createClient();
    const { data: { user }, error: authError } = await clientSupabase.auth.getUser();

    // Debug auth issues
    console.log('Auth check in documents API:', user ? 'User authenticated' : 'No user');
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - You must be logged in' }, { status: 401 });
    }

    // Role-based access control using admin client for role lookup
    const userRole = await getUserRole(user.id);
    console.log('User role in documents API:', userRole);
    
    if (userRole !== 'Super Admin' && userRole !== 'Knowledge Manager') {
      return NextResponse.json({ error: 'Insufficient permissions - Only Super Admin and Knowledge Manager roles can access this' }, { status: 403 });
    }
    
    // Use admin client for database operations after authentication check
    const supabase = await createAdminClient();

    // Get the knowledge base
    const { data: kb, error: kbError } = await supabase
      .from('knowledge_bases')
      .select('*')
      .eq('id', kbId)
      .single();
    
    console.log('Knowledge base query result:', kb ? 'Found' : 'Not found', kbError ? `Error: ${kbError.message}` : 'No error');

    if (kbError || !kb) {
      return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 });
    }

    // Get all documents for this KB
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('knowledge_base_id', kbId)
      .order('created_at', { ascending: false });
      
    console.log('Documents query result:', documents ? `Found ${documents.length} documents` : 'No documents', 
      documentsError ? `Error: ${documentsError.message}` : 'No error');

    if (documentsError) {
      return NextResponse.json({ error: `Failed to fetch documents: ${documentsError.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      knowledgeBase: kb,
      documents: documents || []
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
