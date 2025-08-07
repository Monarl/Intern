'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatbotRoleGuard } from '@/components/chatbots/chatbot-role-guard';

// Role-based access control
const ALLOWED_ROLES = ['Super Admin', 'Chatbot Manager'];

const integrations = [
  {
    id: 'facebook',
    name: 'Facebook Messenger',
    description: 'Integrate chatbot with Facebook Messenger to automatically reply to messages on Facebook Page',
    icon: '📘',
    status: 'available',
    href: '/dashboard/integrations/facebook',
    features: [
      'Automatic message replies',
      'Webhook verification',
      'Manage multiple Facebook Pages',
      'Link to chatbot'
    ]
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Integrate with WhatsApp Business API to support customers through WhatsApp',
    icon: '💬',
    status: 'coming_soon',
    href: '#',
    features: [
      'WhatsApp Business API',
      'Template messages',
      'Media support',
      'Group chat support'
    ]
  },
  {
    id: 'instagram',
    name: 'Instagram Messenger',
    description: 'Automatically reply to Direct Messages on Instagram Business',
    icon: '📷',
    status: 'coming_soon',
    href: '#',
    features: [
      'Instagram DM automation',
      'Story replies',
      'Comment responses',
      'Business account integration'
    ]
  },
  {
    id: 'zalo',
    name: 'Zalo OA',
    description: 'Integrate with Zalo Official Account to support customers through Zalo',
    icon: '💙',
    status: 'coming_soon',
    href: '#',
    features: [
      'Zalo OA API',
      'Template messages',
      'Rich media support',
      'User management'
    ]
  },
  {
    id: 'viber',
    name: 'Viber Business',
    description: 'Integrate chatbot with Viber Business to reach customers through Viber',
    icon: '💜',
    status: 'coming_soon',
    href: '#',
    features: [
      'Viber Bot Platform',
      'Broadcast messages',
      'Keyboard support',
      'Location sharing'
    ]
  }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'available':
      return <Badge variant="default">Available</Badge>;
    case 'coming_soon':
      return <Badge variant="secondary">Coming Soon</Badge>;
    case 'beta':
      return <Badge variant="outline">Beta</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

export default function IntegrationsPage() {
  return (
    <ChatbotRoleGuard
      allowedRoles={ALLOWED_ROLES}
      fallbackMessage="You do not have permission to access integrations. Only Super Admin and Chatbot Manager can manage platform integrations."
    >
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Platform Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Integrate chatbot with popular messaging platforms to expand customer reach capabilities
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                  </div>
                </div>
                {getStatusBadge(integration.status)}
              </div>
              <CardDescription>{integration.description}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {/* Features */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Key Features:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {integration.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-current rounded-full mr-2"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  {integration.status === 'available' ? (
                    <Link href={integration.href}>
                      <Button className="w-full">
                        Configure
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className="w-full">
                      {integration.status === 'coming_soon' ? 'Coming Soon' : 'Not Available'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
          <CardDescription>
            Basic steps to integrate chatbot with messaging platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Create and configure chatbot</h4>
              <p className="text-sm text-muted-foreground">
                First, you need to create a chatbot and configure the knowledge base in the chatbot management section.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">2. Prepare API information</h4>
              <p className="text-sm text-muted-foreground">
                Each platform requires different API information (App ID, Secret, Access Token, etc.). 
                Please prepare all necessary information before configuration.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">3. Configure webhook</h4>
              <p className="text-sm text-muted-foreground">
                The system will automatically provide webhook URLs for you to configure in each platform&apos;s dashboard.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">4. Test and activate</h4>
              <p className="text-sm text-muted-foreground">
                After configuration is complete, use the connection test function and activate the integration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </ChatbotRoleGuard>
  );
}