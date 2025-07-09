# Enterprise Chatbot System - Initial Tasks

## Prerequisites Setup (Week 1)

### 0. Project Setup and Guidelines
- [x] Create global.instructions.md for development standards (July 9, 2025)
- [x] Update project structure to use Supabase Dashboard and npm n8n (July 9, 2025)


### 1. Development Environment Setup
- [x] Install Node.js (v18+) and npm/yarn (Node.js v20.17.0, npm v11.4.2 detected)
- [x] Install Git and configure GitHub account (git version 2.45.2.windows.1 detected)
- [x] Install VS Code with recommended extensions (VS Code 1.101.2 detected)
- [x] Install n8n globally via npm (n8n 1.97.1 detected)

### 2. Service Account Creation
- [ ] Create Supabase account and new project
- [ ] Create Gemini account and get API keys
- [ ] Set up n8n locally via npm (no separate account needed)
- [ ] Create Facebook Developer account
- [ ] Create WhatsApp Business API account (if needed)


### 3. Initial Project Structure
- [x] Create initial project structure (folders and .env.example created on July 9, 2025)
```
chatbot-enterprise/
├── admin-dashboard/          # Next.js admin interface
├── chat-widget/             # Embeddable chat widget
├── n8n-workflows/           # Exported n8n workflow files (.json)
├── docs/                    # Documentation
├── tests/                   # Test files
└── .env.example            # Environment variables template
```

**Note**: Database schema and RLS policies are managed through Supabase web interface. n8n runs locally via npm.

## Phase 1: Foundation Setup (Week 1-2)

### Task 1.1: Supabase Project Setup
**Priority: High | Estimated Time: 4 hours**

- [ ] Create new Supabase project through web interface
- [ ] Enable pgvector extension in SQL Editor (Dashboard → SQL Editor):
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- [ ] Create initial database schema using SQL Editor:
  ```sql
  -- User roles and permissions
  CREATE TABLE user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Knowledge bases
  CREATE TABLE knowledge_bases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Documents
  CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    file_path TEXT,
    file_type TEXT,
    status TEXT DEFAULT 'processing',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Document chunks with embeddings
  CREATE TABLE document_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768), -- Gemini embedding-001 dimension
    chunk_index INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create vector similarity search index
  CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops);
  ```

- [ ] Configure Row Level Security (RLS) policies through Authentication → Policies in Dashboard
- [ ] Set up Supabase Storage buckets through Storage → Buckets in Dashboard
- [ ] Configure CORS settings in API Settings

### Task 1.2: n8n Installation and Configuration
**Priority: High | Estimated Time: 3 hours**

**Local npm Installation (Recommended for development)**
- [ ] Install n8n globally:
  ```bash
  npm install n8n -g
  ```
- [ ] Start n8n locally:
  ```bash
  n8n start
  ```
- [ ] Access n8n at http://localhost:5678
- [ ] Create initial user account through web interface

**Configuration:**
- [ ] Configure environment variables for Gemini API in n8n settings
- [ ] Configure Supabase connection credentials in n8n
- [ ] Set up webhooks for workflow triggers
- [ ] Test basic workflow creation and execution

**Note**: For production, consider n8n Cloud or self-hosted Docker deployment

### Task 1.3: Next.js Admin Dashboard Setup
**Priority: Medium | Estimated Time: 4 hours**

- [ ] Initialize Next.js project with TypeScript:
  ```bash
  npx create-next-app@latest admin-dashboard --typescript --tailwind --eslint --app
  ```

- [ ] Install required dependencies:
  ```bash
  npm install @supabase/auth-helpers-nextjs @supabase/supabase-js
  npm install @headlessui/react @heroicons/react
  npm install react-hook-form zod @hookform/resolvers
  npm install recharts lucide-react
  ```

- [ ] Configure Supabase client:
  ```typescript
  // lib/supabase.ts
  import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
  import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
  import { cookies } from 'next/headers'

  export const createClient = () => createClientComponentClient()
  export const createServerClient = () => createServerComponentClient({ cookies })
  ```

- [ ] Set up authentication pages (login, register, forgot password)
- [ ] Create basic layout with navigation
- [ ] Implement protected route middleware

### Task 1.4: Basic Authentication System
**Priority: High | Estimated Time: 3 hours**

- [ ] Configure Supabase Auth settings:
  - Enable email authentication
  - Set up email templates
  - Configure redirect URLs

- [ ] Create auth context/provider:
  ```typescript
  // context/AuthContext.tsx
  'use client'
  import { createContext, useContext, useEffect, useState } from 'react'
  import { createClient } from '@/lib/supabase'
  import type { User } from '@supabase/auth-helpers-nextjs'

  interface AuthContextType {
    user: User | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<void>
    signUp: (email: string, password: string) => Promise<void>
    signOut: () => Promise<void>
  }

  const AuthContext = createContext<AuthContextType | undefined>(undefined)

  export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Implementation
  }

  export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
      throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
  }
  ```

- [ ] Implement login/logout functionality
- [ ] Create role-based access control
- [ ] Test authentication flow

## Phase 2: Core RAG System (Week 3-4)

### Task 2.1: Document Processing n8n Workflow
**Priority: High | Estimated Time: 6 hours**

- [ ] Create "Document Processing" workflow in n8n:
  1. **Webhook Trigger**: Receive file upload notifications
  2. **File Download**: Get file from Supabase Storage
  3. **Content Extraction**: Use appropriate node based on file type
     - PDF: PDF Extract node
     - DOCX: Binary to text conversion
     - TXT: Direct text processing
  4. **Text Chunking**: Split content into manageable chunks
  5. **Gemini Embeddings**: Generate vector embeddings
  6. **Supabase Insert**: Store chunks and embeddings in database
  7. **Status Update**: Mark document as processed

- [ ] Configure error handling and retry logic
- [ ] Set up webhook endpoints for triggering
- [ ] Test with various file formats

### Task 2.2: Web Scraping Workflow
**Priority: Medium | Estimated Time: 4 hours**

- [ ] Create "Web Scraping" workflow:
  1. **Webhook Trigger**: Receive URL input
  2. **HTTP Request**: Fetch web page content
  3. **HTML Extract**: Extract text content from HTML
  4. **Content Cleaning**: Remove navigation, ads, etc.
  5. **Text Chunking**: Split content appropriately
  6. **Gemini Embeddings**: Generate embeddings
  7. **Supabase Insert**: Store processed content

- [ ] Handle different website structures
- [ ] Implement sitemap processing option
- [ ] Add URL validation and security checks

### Task 2.3: RAG Query Workflow
**Priority: High | Estimated Time: 5 hours**

- [ ] Create "RAG Query" workflow:
  1. **Webhook Trigger**: Receive chat message
  2. **Gemini Embeddings**: Generate query embedding
  3. **Supabase Query**: Vector similarity search
  4. **Context Assembly**: Combine relevant chunks
  5. **Prompt Construction**: Build LLM prompt with context
  6. **Gemini Chat**: Generate response
  7. **Response Formatting**: Clean and format output
  8. **Webhook Response**: Return formatted response

- [ ] Implement conversation memory management
- [ ] Add fallback responses for low-confidence queries
- [ ] Configure response filtering and safety checks

### Task 2.4: Knowledge Base Management UI
**Priority: Medium | Estimated Time: 5 hours**

- [ ] Create knowledge base listing page
- [ ] Implement file upload interface:
  ```typescript
  // components/FileUpload.tsx
  import { useState } from 'react'
  import { createClient } from '@/lib/supabase'

  export function FileUpload({ knowledgeBaseId }: { knowledgeBaseId: string }) {
    const [uploading, setUploading] = useState(false)
    
    const handleUpload = async (file: File) => {
      setUploading(true)
      try {
        const supabase = createClient()
        
        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(`${knowledgeBaseId}/${file.name}`, file)
        
        if (error) throw error
        
        // Trigger n8n workflow for processing
        await fetch('/api/process-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            knowledgeBaseId,
            filePath: data.path,
            fileName: file.name
          })
        })
        
        // Refresh UI
      } catch (error) {
        console.error('Upload failed:', error)
      } finally {
        setUploading(false)
      }
    }
    
    // Component JSX
  }
  ```

- [ ] Add URL input for web scraping
- [ ] Create document management interface
- [ ] Implement document deletion with embedding cleanup

## Phase 3: Basic Chatbot Interface (Week 5-6)

### Task 3.1: Chat Widget Development
**Priority: High | Estimated Time: 6 hours**

- [ ] Create embeddable React chat widget:
  ```typescript
  // chat-widget/src/ChatWidget.tsx
  import React, { useState, useEffect } from 'react'
  import { createClient } from '@supabase/supabase-js'

  interface ChatWidgetProps {
    chatbotId: string
    apiUrl: string
    supabaseUrl: string
    supabaseAnonKey: string
  }

  export function ChatWidget({ chatbotId, apiUrl, supabaseUrl, supabaseAnonKey }: ChatWidgetProps) {
    // Real-time chat implementation
  }
  ```

- [ ] Implement real-time messaging with Supabase
- [ ] Add typing indicators and message status
- [ ] Create responsive design for mobile/desktop
- [ ] Build widget customization options (colors, position, etc.)

### Task 3.2: Chat Session Management n8n Workflow
**Priority: Medium | Estimated Time: 3 hours**

- [ ] Create "Chat Session Management" workflow:
  1. **Session Creation**: Initialize new chat sessions
  2. **Message Routing**: Direct messages to appropriate handlers
  3. **Context Management**: Maintain conversation history
  4. **Session Cleanup**: Archive old sessions

- [ ] Implement user identification and session persistence
- [ ] Add message rate limiting and spam protection

### Task 3.3: Admin Chat Management Interface
**Priority: Medium | Estimated Time: 4 hours**

- [ ] Create chat history viewing interface
- [ ] Implement real-time chat monitoring
- [ ] Add analytics dashboard for chat metrics
- [ ] Create chatbot configuration forms

## Phase 4: Human Handoff System (Week 7-8)

### Task 4.1: Human Handoff n8n Workflow
**Priority: High | Estimated Time: 4 hours**

- [ ] Create "Human Handoff" workflow:
  1. **Handoff Trigger**: Detect escalation needs
  2. **Agent Notification**: Alert available support agents
  3. **Session Transfer**: Move chat to agent interface
  4. **Context Sharing**: Provide conversation history
  5. **Status Management**: Track handoff status

### Task 4.2: Customer Support Interface
**Priority: High | Estimated Time: 5 hours**

- [ ] Create CS agent dashboard
- [ ] Implement agent availability management
- [ ] Add live chat interface for agents
- [ ] Create handoff request queue

### Task 4.3: Integration Testing
**Priority: High | Estimated Time: 3 hours**

- [ ] Test end-to-end chat flow
- [ ] Verify RAG accuracy and response quality
- [ ] Test human handoff scenarios
- [ ] Performance testing and optimization

## Daily Development Tasks

### Week 1 Daily Breakdown:
**Monday**: Development environment setup, Node.js and npm n8n installation
**Tuesday**: Supabase project creation via Dashboard, database schema via SQL Editor
**Wednesday**: RLS policies setup via Dashboard, n8n local setup and basic workflows
**Thursday**: Next.js admin dashboard initialization
**Friday**: Authentication system implementation

### Week 2 Daily Breakdown:
**Monday**: Complete authentication, start document processing workflow
**Tuesday**: Finish document processing, test file uploads
**Wednesday**: Web scraping workflow development
**Thursday**: RAG query workflow creation
**Friday**: Integration testing and bug fixes

## Success Criteria for Each Task

### Phase 1 Completion:
- [ ] Users can register and login to admin dashboard
- [ ] Basic n8n workflows can be created and executed
- [ ] Supabase database is properly configured with vector support
- [ ] File uploads trigger n8n workflows successfully

### Phase 2 Completion:
- [ ] Documents can be uploaded and processed into embeddings
- [ ] Web URLs can be scraped and processed
- [ ] RAG queries return relevant, coherent responses
- [ ] Knowledge base management interface is functional

### Phase 3 Completion:
- [ ] Chat widget can be embedded in websites
- [ ] Real-time messaging works reliably
- [ ] Basic chatbot conversations function properly
- [ ] Admin can monitor and manage chats

### Phase 4 Completion:
- [ ] Human handoff triggers correctly
- [ ] Support agents can take over conversations
- [ ] Session context is preserved during handoffs
- [ ] Complete end-to-end system testing passes

## Tools and Resources Needed

### Development Tools:
- VS Code with extensions: ES7+ React/Redux/React-Native snippets, Tailwind CSS IntelliSense
- Postman for API testing
- Git for version control
- Chrome DevTools for debugging

### Documentation and Learning:
- Supabase Documentation: https://supabase.com/docs
- Gemini API Documentation: https://ai.google.dev/docs
- n8n Documentation: https://docs.n8n.io/
- Next.js Documentation: https://nextjs.org/docs
- Gemini API Documentation: https://ai.google.dev/docs

### API Keys and Secrets:
- Gemini API key (gemini-1.5-pro and embedding-001 access)
- Supabase project URL and anon key
- n8n webhook URLs
- Facebook Graph API credentials (for later phases)

## Risk Mitigation Strategies

### Technical Risks:
- **API Rate Limits**: Implement request queuing and retry logic
- **Vector Search Performance**: Monitor query times and optimize indexes
- **n8n Workflow Failures**: Add comprehensive error handling and alerts

### Timeline Risks:
- **Scope Creep**: Stick to MVP features for initial implementation
- **Integration Complexity**: Test integrations early and often
- **Learning Curve**: Allocate extra time for new technology adoption

This task breakdown provides a clear, actionable roadmap for building the enterprise chatbot system while leveraging n8n workflows to minimize custom coding requirements.
