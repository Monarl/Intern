import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-app';
import { createAdminClient } from '@/app/lib/supabase/server';
import { getUserRole } from '@/app/lib/supabase/user-roles';

// GET handler to list knowledge bases (already implemented)
export { GET } from './list/route';

// POST handler to create a new knowledge base
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Knowledge base name is required' }, { status: 400 });
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

    // Create knowledge base using admin client
    const { data, error } = await adminSupabase
      .from('knowledge_bases')
      .insert({
        name: name.trim(),
        description: description || null,
        owner_id: user.id
      })
      .select();

    if (error) {
      return NextResponse.json({ error: `Failed to create knowledge base: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      knowledgeBase: data?.[0] || null
    });

  } catch (error) {
    console.error('Error creating knowledge base:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
