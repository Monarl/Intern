import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

interface FacebookPageInfo {
  id: string;
  name: string;
  category: string;
  verification_status: string;
  link: string;
}

interface WebhookStatus {
  data: Array<{
    id: string;
    subscribed_fields: string[];
  }>;
}

interface Permissions {
  data: Array<{
    permission: string;
    status: string;
  }>;
}

// Test Facebook page connection
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageId } = await request.json();

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    // Get Facebook page configuration
    const { data: page, error: pageError } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('id', pageId)
      .eq('owner_id', user.id)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Facebook page not found' }, { status: 404 });
    }

    // Test Facebook Graph API connection
    const testResults: {
      page_info: FacebookPageInfo | null;
      webhook_status: WebhookStatus | null;
      permissions: Permissions | null;
      errors: string[];
    } = {
      page_info: null,
      webhook_status: null,
      permissions: null,
      errors: []
    };

    const facebookApiBase = process.env.FACEBOOK_GRAPH_API_BASE_URL || 'https://graph.facebook.com'
    const facebookApiVersion = process.env.FACEBOOK_API_VERSION || 'v18.0'

    try {
      // Test 1: Get page information
      const pageInfoResponse = await fetch(
        `${facebookApiBase}/${facebookApiVersion}/${page.page_id}?fields=id,name,category,verification_status,link&access_token=${page.page_access_token}`
      );
      
      if (pageInfoResponse.ok) {
        testResults.page_info = await pageInfoResponse.json();
      } else {
        const error = await pageInfoResponse.json();
        testResults.errors.push(`Page info error: ${error.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      testResults.errors.push(`Page info request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Test 2: Check webhook subscriptions
      const webhookResponse = await fetch(
        `${facebookApiBase}/${facebookApiVersion}/${page.page_id}/subscribed_apps?access_token=${page.page_access_token}`
      );
      
      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        testResults.webhook_status = webhookData;
      } else {
        const error = await webhookResponse.json();
        testResults.errors.push(`Webhook status error: ${error.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      testResults.errors.push(`Webhook status request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Test 3: Check token permissions
      const permissionsResponse = await fetch(
        `${facebookApiBase}/${facebookApiVersion}/me/permissions?access_token=${page.page_access_token}`
      );
      
      if (permissionsResponse.ok) {
        testResults.permissions = await permissionsResponse.json();
      } else {
        const error = await permissionsResponse.json();
        testResults.errors.push(`Permissions error: ${error.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      testResults.errors.push(`Permissions request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Update page's last test time
    await supabase
      .from('facebook_pages')
      .update({ 
        settings: { 
          ...page.settings, 
          last_test: new Date().toISOString(),
          test_results: testResults
        }
      })
      .eq('id', pageId);

    // Determine overall status
    const isHealthy = testResults.errors.length === 0 && 
                     testResults.page_info && 
                     testResults.webhook_status;

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'error',
      results: testResults,
      message: isHealthy 
        ? 'Facebook page connection is working properly' 
        : 'Some issues detected with Facebook page connection'
    });

  } catch (error) {
    console.error('Error testing Facebook connection:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}