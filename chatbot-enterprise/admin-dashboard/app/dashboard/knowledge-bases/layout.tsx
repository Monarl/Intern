import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Knowledge Bases | Chatbot Enterprise',
  description: 'Manage knowledge bases for your chatbot',
}

export default function KnowledgeBasesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>{children}</div>
  )
}
