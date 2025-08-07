'use client';

import { useState, useEffect } from 'react';
import { FacebookMessengerConfig } from '@/components/integrations/facebook-messenger-config';
import { ChatbotRoleGuard } from '@/components/chatbots/chatbot-role-guard';
import { toast } from 'sonner';

// Role-based access control
const ALLOWED_ROLES = ['Super Admin', 'Chatbot Manager'];

interface FacebookPageSettings {
  auto_reply: boolean;
  welcome_message: string;
  fallback_message: string;
}

interface FacebookPage {
  id: string;
  name: string;
  page_id: string;
  page_access_token: string;
  app_id: string;
  app_secret: string;
  verify_token: string;
  webhook_url: string | null;
  chatbot_id: string | null;
  is_active: boolean;
  settings: FacebookPageSettings;
  created_at: string;
}

interface Chatbot {
  id: string;
  name: string;
  description: string;
}

export default function FacebookIntegrationPage() {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load Facebook pages and chatbots in parallel
      const [pagesResponse, chatbotsResponse] = await Promise.all([
        fetch('/api/integrations/facebook'),
        fetch('/api/dashboard/chatbots')
      ]);

      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        setPages(pagesData.pages || []);
      } else {
        throw new Error('Failed to load Facebook pages');
      }

      if (chatbotsResponse.ok) {
        const chatbotsData = await chatbotsResponse.json();
        console.log('Loaded chatbots:', chatbotsData); // Debug log
        setChatbots(chatbotsData.chatbots || []);
      } else {
        // Chatbots are optional, don't throw error
        console.warn('Failed to load chatbots:', await chatbotsResponse.text());
        setChatbots([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (config: {
    id?: string;
    name: string;
    page_id: string;
    page_access_token: string;
    app_id: string;
    app_secret: string;
    verify_token: string;
    chatbot_id: string;
    is_active: boolean;
    settings: FacebookPageSettings;
  }) => {
    try {
      const response = await fetch('/api/integrations/facebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }

      await loadData(); // Reload data
    } catch (error) {
      console.error('Error saving Facebook config:', error);
      throw error; // Re-throw to be handled by the component
    }
  };

  const handleDelete = async (pageId: string) => {
    try {
      const response = await fetch(`/api/integrations/facebook?id=${pageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete configuration');
      }

      await loadData(); // Reload data
    } catch (error) {
      console.error('Error deleting Facebook config:', error);
      throw error; // Re-throw to be handled by the component
    }
  };

  const handleTest = async (pageId: string) => {
    try {
      const response = await fetch('/api/integrations/facebook/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageId }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Test failed');
      }

      if (result.status === 'healthy') {
        toast.success('Facebook connection is working normally');
      } else {
        toast.warning('Some issues detected with Facebook connection. Check console for details.');
        console.warn('Facebook connection test results:', result.results);
      }
    } catch (error) {
      console.error('Error testing Facebook connection:', error);
      throw error; // Re-throw to be handled by the component
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ChatbotRoleGuard
      allowedRoles={ALLOWED_ROLES}
      fallbackMessage="You do not have permission to access Facebook integration. Only Super Admin and Chatbot Manager can manage platform integrations."
    >
      <div className="container mx-auto py-6">
        <FacebookMessengerConfig
          pages={pages}
          chatbots={chatbots}
          onSave={handleSave}
          onDelete={handleDelete}
          onTest={handleTest}
        />
      </div>
    </ChatbotRoleGuard>
  );
}