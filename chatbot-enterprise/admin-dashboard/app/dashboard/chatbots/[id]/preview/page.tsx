'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Chatbot {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  knowledge_base_ids: string[];
  n8n_webhook_url: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export default function ChatbotPreviewPage() {
  const params = useParams();
  const chatbotId = params.id as string;
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChatbot = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/dashboard/chatbots/${chatbotId}`);
        if (!response.ok) {
          throw new Error('Failed to load chatbot');
        }

        const data = await response.json();
        setChatbot(data.chatbot);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    if (chatbotId) {
      loadChatbot();
    }
  }, [chatbotId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading chatbot...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !chatbot) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-500 mb-4">
                  {error || 'Chatbot not found'}
                </p>
                <Link href="/dashboard/chatbots">
                  <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Chatbots
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/chatbots">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{chatbot.name}</h1>
            <p className="text-muted-foreground">{chatbot.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={chatbot.is_active ? "default" : "secondary"}>
            {chatbot.is_active ? "Active" : "Inactive"}
          </Badge>
          <Link href={`/dashboard/chatbots/${chatbot.id}/edit`}>
            <Button variant="outline">
              Edit Chatbot
            </Button>
          </Link>
        </div>
      </div>

      {/* Preview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chatbot Info */}
        <Card>
          <CardHeader>
            <CardTitle>Chatbot Information</CardTitle>
            <CardDescription>
              Configuration and settings overview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <p className="text-sm text-muted-foreground">{chatbot.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <p className="text-sm text-muted-foreground">
                {chatbot.description || 'No description provided'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <p className="text-sm text-muted-foreground">
                {chatbot.is_active ? 'Active and responding to messages' : 'Inactive'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Knowledge Bases</label>
              <p className="text-sm text-muted-foreground">
                {chatbot.knowledge_base_ids?.length || 0} knowledge bases connected
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">N8N Integration</label>
              <p className="text-sm text-muted-foreground">
                {chatbot.n8n_webhook_url ? 'Connected to N8N workflow' : 'No N8N integration'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Chat Interface Preview
            </CardTitle>
            <CardDescription>
              Test your chatbot in a simulated environment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 min-h-[300px]">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Chat interface preview will be available soon</p>
                <p className="text-sm">
                  Use the chat widget or integration platforms to test your chatbot
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>
            Access related features and integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard/knowledge-base">
              <Button variant="outline" className="w-full justify-start">
                <ExternalLink className="w-4 h-4 mr-2" />
                Manage Knowledge Base
              </Button>
            </Link>
            <Link href="/dashboard/integrations">
              <Button variant="outline" className="w-full justify-start">
                <ExternalLink className="w-4 h-4 mr-2" />
                Platform Integrations
              </Button>
            </Link>
            <Link href="/dashboard/chats">
              <Button variant="outline" className="w-full justify-start">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Chat History
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}