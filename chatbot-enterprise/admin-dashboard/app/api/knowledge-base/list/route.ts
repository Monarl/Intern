import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-app';
import { createAdminClient } from '@/app/lib/supabase/server';

export async function GET(request: Request) {
  try {
    // Get the cookie header from the request
    const cookieHeader = request.headers.get('cookie');
    console.log('Cookie header present:', !!cookieHeader);
    
    // User validation and authentication check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error in knowledge-base list API:', authError);
      return NextResponse.json({ error: 'Authentication error: ' + authError.message }, { status: 401 });
    }
    
    if (!user) {
      console.error('No authenticated user found in knowledge-base list API');
      return NextResponse.json({ error: 'Unauthorized - You must be logged in' }, { status: 401 });
    }
    
    console.log('User authenticated in knowledge-base list API:', user.email);

    // Role-based access control
    // Use admin client to ensure we get the correct role
    const adminSupabase = await createAdminClient();
    const { data: roleMapping } = await adminSupabase
      .from('user_role_mappings')
      .select('role_id')
      .eq('user_id', user.id)
      .single();
    
    if (!roleMapping?.role_id) {
      return NextResponse.json({ error: 'No role assigned to user' }, { status: 403 });
    }
    
    const { data: roleData } = await adminSupabase
      .from('user_roles')
      .select('name')
      .eq('id', roleMapping.role_id)
      .single();
    
    const userRole = roleData?.name;
    console.log('User role in knowledge-base list API:', userRole);
    
    if (userRole !== 'Super Admin' && userRole !== 'Knowledge Manager') {
      return NextResponse.json({ error: `Insufficient permissions - Required: Super Admin or Knowledge Manager, Got: ${userRole || 'none'}` }, { status: 403 });
    }

    // Get all knowledge bases
    const { data: knowledgeBases, error: kbError } = await adminSupabase
      .from('knowledge_bases')
      .select('*, documents(count)')
      .order('created_at', { ascending: false });

    if (kbError) {
      return NextResponse.json({ error: `Failed to fetch knowledge bases: ${kbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ knowledgeBases });

  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
