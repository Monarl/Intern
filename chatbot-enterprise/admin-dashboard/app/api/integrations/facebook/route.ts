import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// Get all Facebook pages for the current user
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Facebook pages with associated chatbot information
    const { data: pages, error } = await supabase
      .from('facebook_pages')
      .select(`
        *,
        chatbots (
          id,
          name,
          description
        )
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching Facebook pages:', error);
      return NextResponse.json({ error: 'Failed to fetch Facebook pages' }, { status: 500 });
    }

    return NextResponse.json({ pages: pages || [] });
  } catch (error) {
    console.error('Error in GET /api/integrations/facebook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create or update Facebook page configuration
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      id,
      name,
      page_id,
      page_access_token,
      app_id,
      app_secret,
      verify_token,
      chatbot_id,
      is_active,
      settings
    } = body;

    // Validate required fields
    if (!name || !page_id || !page_access_token || !app_id || !app_secret || !verify_token) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, page_id, page_access_token, app_id, app_secret, verify_token' 
      }, { status: 400 });
    }

    // Check if page_id already exists (for create operation)
    if (!id) {
      const { data: existingPage } = await supabase
        .from('facebook_pages')
        .select('id')
        .eq('page_id', page_id)
        .single();

      if (existingPage) {
        return NextResponse.json({ 
          error: 'Facebook page with this Page ID already exists' 
        }, { status: 400 });
      }
    }

    // Verify chatbot ownership if provided
    if (chatbot_id) {
      const { data: chatbot, error: chatbotError } = await supabase
        .from('chatbots')
        .select('id')
        .eq('id', chatbot_id)
        .eq('owner_id', user.id)
        .single();

      if (chatbotError || !chatbot) {
        return NextResponse.json({ 
          error: 'Invalid chatbot ID or you do not have permission to use this chatbot' 
        }, { status: 400 });
      }
    }

    const pageData = {
      name,
      page_id,
      page_access_token,
      app_id,
      app_secret,
      verify_token,
      chatbot_id: chatbot_id || null,
      owner_id: user.id,
      is_active: is_active ?? true,
      settings: settings || {},
      webhook_url: `${new URL(request.url).origin}/api/webhooks/facebook`
    };

    let result;
    if (id) {
      // Update existing page
      const { data, error } = await supabase
        .from('facebook_pages')
        .update({
          ...pageData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating Facebook page:', error);
        return NextResponse.json({ error: 'Failed to update Facebook page' }, { status: 500 });
      }
      result = { page: data, message: 'Facebook page updated successfully' };
    } else {
      // Create new page
      const { data, error } = await supabase
        .from('facebook_pages')
        .insert(pageData)
        .select()
        .single();

      if (error) {
        console.error('Error creating Facebook page:', error);
        return NextResponse.json({ error: 'Failed to create Facebook page' }, { status: 500 });
      }
      result = { page: data, message: 'Facebook page created successfully' };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/integrations/facebook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete Facebook page configuration  
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const pageId = url.searchParams.get('id');

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    // Delete the page (this will cascade delete related webhook logs)
    const { error } = await supabase
      .from('facebook_pages')
      .delete()
      .eq('id', pageId)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Error deleting Facebook page:', error);
      return NextResponse.json({ error: 'Failed to delete Facebook page' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Facebook page deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/integrations/facebook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}