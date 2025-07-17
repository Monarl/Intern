import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documents | Knowledge Base | Chatbot Enterprise',
  description: 'Manage documents in your knowledge base',
}

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>{children}</div>
  )
}
