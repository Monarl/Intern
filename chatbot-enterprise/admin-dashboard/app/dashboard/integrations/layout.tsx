import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Integrations - Admin Dashboard',
  description: 'Manage platform integrations and external services',
};

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
}