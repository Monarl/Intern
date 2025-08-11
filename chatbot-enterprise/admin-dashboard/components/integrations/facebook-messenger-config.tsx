'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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

interface FacebookPageConfig {
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
}

interface FacebookMessengerConfigProps {
  pages: FacebookPage[];
  chatbots: Chatbot[];
  onSave: (config: FacebookPageConfig) => Promise<void>;
  onDelete: (pageId: string) => Promise<void>;
  onTest: (pageId: string) => Promise<void>;
}

export function FacebookMessengerConfig({ 
  pages, 
  chatbots, 
  onSave, 
  onDelete, 
  onTest 
}: FacebookMessengerConfigProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingPage, setEditingPage] = useState<FacebookPage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<FacebookPageConfig>({
    name: '',
    page_id: '',
    page_access_token: '',
    app_id: '',
    app_secret: '',
    verify_token: '',
    chatbot_id: '',
    is_active: true,
    settings: {
      auto_reply: true,
      welcome_message: 'Hello! I am a customer support chatbot. How can I help you?',
      fallback_message: 'Sorry, I do not understand your question. Could you please try again with a different question?'
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      page_id: '',
      page_access_token: '',
      app_id: '',
      app_secret: '',
      verify_token: '',
      chatbot_id: '',
      is_active: true,
      settings: {
        auto_reply: true,
        welcome_message: 'Hello! I am a customer support chatbot. How can I help you?',
        fallback_message: 'Sorry, I do not understand your question. Could you please try again with a different question?'
      }
    });
    setIsCreating(false);
    setEditingPage(null);
  };

  const handleEdit = (page: FacebookPage) => {
    setEditingPage(page);
    setFormData({
      name: page.name,
      page_id: page.page_id,
      page_access_token: page.page_access_token,
      app_id: page.app_id,
      app_secret: page.app_secret,
      verify_token: page.verify_token,
      chatbot_id: page.chatbot_id || '',
      is_active: page.is_active,
      settings: page.settings || {
        auto_reply: true,
        welcome_message: 'Hello! I am a customer support chatbot. How can I help you?',
        fallback_message: 'Sorry, I do not understand your question. Could you please try again with a different question?'
      }
    });
    setIsCreating(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.page_id || !formData.page_access_token || 
        !formData.app_id || !formData.app_secret || !formData.verify_token) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        ...formData,
        id: editingPage?.id
      });
      
      toast.success(editingPage ? 'Updated successfully' : 'Configuration created successfully');
      resetForm();
    } catch (error) {
      toast.error('An error occurred. Please try again.');
      console.error('Error saving Facebook config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    
    setIsLoading(true);
    try {
      await onDelete(pageId);
      toast.success('Configuration deleted successfully');
    } catch (error) {
      toast.error('An error occurred while deleting configuration');
      console.error('Error deleting Facebook config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async (pageId: string) => {
    setIsLoading(true);
    try {
      await onTest(pageId);
      toast.success('Connection test successful');
    } catch (error) {
      toast.error('Connection test failed');
      console.error('Error testing Facebook connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateVerifyToken = () => {
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    setFormData({ ...formData, verify_token: token });
  };

  const getWebhookUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/webhooks/facebook`;
    }
    return '/api/webhooks/facebook';
  };

  const isLocalhost = () => {
    if (typeof window !== 'undefined') {
      return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Facebook Messenger Integration</h2>
          <p className="text-muted-foreground">
            Configure chatbot integration with Facebook Messenger
          </p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            Add Facebook Page
          </Button>
        )}
      </div>

      {/* Webhook URL Info */}
      <Alert>
        <AlertDescription>
          <strong>Webhook URL:</strong> {getWebhookUrl()}
          <br />
          Use this URL when configuring webhooks in your Facebook App.
          {isLocalhost() && (
            <>
              <br />
              <br />
              <span className="text-amber-600 font-medium">⚠️ Warning:</span> Your current URL uses localhost. 
              Facebook requires HTTPS URLs for webhooks. Please use ngrok or deploy to a domain with HTTPS 
              to set up Facebook webhooks properly.
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingPage ? 'Edit' : 'Add'} Facebook Page
            </CardTitle>
            <CardDescription>
              Configure Facebook Page and App information to integrate with chatbot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g.: Company ABC Fanpage"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page_id">Facebook Page ID *</Label>
                  <Input
                    id="page_id"
                    value={formData.page_id}
                    onChange={(e) => setFormData({ ...formData, page_id: e.target.value })}
                    placeholder="Facebook Page ID"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="page_access_token">Page Access Token *</Label>
                <Input
                  id="page_access_token"
                  type="password"
                  value={formData.page_access_token}
                  onChange={(e) => setFormData({ ...formData, page_access_token: e.target.value })}
                  placeholder="Page Access Token from Facebook App"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="app_id">Facebook App ID *</Label>
                  <Input
                    id="app_id"
                    value={formData.app_id}
                    onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
                    placeholder="App ID from Facebook Developer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app_secret">Facebook App Secret *</Label>
                  <Input
                    id="app_secret"
                    type="password"
                    value={formData.app_secret}
                    onChange={(e) => setFormData({ ...formData, app_secret: e.target.value })}
                    placeholder="App Secret from Facebook Developer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify_token">Verify Token *</Label>
                <div className="flex gap-2">
                  <Input
                    id="verify_token"
                    value={formData.verify_token}
                    onChange={(e) => setFormData({ ...formData, verify_token: e.target.value })}
                    placeholder="Token for webhook verification"
                  />
                  <Button type="button" variant="outline" onClick={generateVerifyToken}>
                    Generate Token
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatbot_id">Linked Chatbot</Label>
                <Select 
                  value={formData.chatbot_id} 
                  onValueChange={(value) => setFormData({ ...formData, chatbot_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select chatbot to link" />
                  </SelectTrigger>
                  <SelectContent>
                    {chatbots.length === 0 ? (
                      <SelectItem value="" disabled>
                        No chatbots available. Create a chatbot first.
                      </SelectItem>
                    ) : (
                      chatbots.map((chatbot) => (
                        <SelectItem key={chatbot.id} value={chatbot.id}>
                          {chatbot.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {chatbots.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    You need to create a chatbot first before configuring Facebook integration.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Advanced Settings</h4>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Activate</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto_reply"
                    checked={formData.settings.auto_reply}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      settings: { ...formData.settings, auto_reply: checked }
                    })}
                  />
                  <Label htmlFor="auto_reply">Auto Reply</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome_message">Welcome Message</Label>
                  <Textarea
                    id="welcome_message"
                    value={formData.settings.welcome_message}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      settings: { ...formData.settings, welcome_message: e.target.value }
                    })}
                    placeholder="Message sent when user starts conversation"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fallback_message">Fallback Message</Label>
                  <Textarea
                    id="fallback_message"
                    value={formData.settings.fallback_message}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      settings: { ...formData.settings, fallback_message: e.target.value }
                    })}
                    placeholder="Message sent when bot doesn't understand the question"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (editingPage ? 'Update' : 'Create')}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Existing Pages List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Configured Facebook Pages</h3>
        
        {pages.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No Facebook Pages configured yet
              </p>
            </CardContent>
          </Card>
        ) : (
          pages.map((page) => (
            <Card key={page.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{page.name}</h4>
                      <Badge variant={page.is_active ? 'default' : 'secondary'}>
                        {page.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Page ID: {page.page_id}</p>
                      <p>App ID: {page.app_id}</p>
                      {page.chatbot_id && (
                        <p>Chatbot: {chatbots.find(c => c.id === page.chatbot_id)?.name || 'Not found'}</p>
                      )}
                      <p>Created: {new Date(page.created_at).toLocaleString('en-US')}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleTest(page.id)}
                      disabled={isLoading}
                    >
                      Test
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(page)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDelete(page.id)}
                      disabled={isLoading}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}