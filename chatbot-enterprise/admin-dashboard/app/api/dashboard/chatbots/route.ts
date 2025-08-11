import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// Get all chatbots for the current user
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get chatbots accessible to the current user (RLS handles filtering)
    const { data: chatbots, error } = await supabase
      .from('chatbots')
      .select('id, name, description, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching chatbots:', error);
      return NextResponse.json({ error: 'Failed to fetch chatbots' }, { status: 500 });
    }

    console.log('Fetched chatbots for user role access, count:', chatbots?.length || 0); // Debug log
    return NextResponse.json({ chatbots: chatbots || [] });
  } catch (error) {
    console.error('Error in GET /api/dashboard/chatbots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}