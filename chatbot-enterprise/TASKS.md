# Enterprise Chatbot System - Initial Tasks

## Bug Fixes and Improvements (Current)

### Bug Fix: Chatbot Deletion Not Working
- [x] Fixed chatbot deletion functionality that was silently failing (July 28, 2025)
- [x] **Root Cause**: Missing DELETE RLS policy for chatbots table
- [x] **Root Cause**: Foreign key constraint with NO ACTION preventing deletion when chat sessions exist
- [x] **Solution**: Added DELETE RLS policy for Super Admin and Chatbot Manager roles
- [x] **Solution**: Updated foreign key constraint to CASCADE delete related chat sessions and messages
- [x] **Database Changes**:
  - Added policy: "Chatbot managers can delete chatbots" 
  - Updated constraint: `chat_sessions_optimized_chatbot_id_fkey` with CASCADE delete
- [x] **Result**: Chatbot deletion now works properly and cleans up related data

### Enhancement: Chatbot Inactive Status Handling
- [x] Added chatbot active/inactive status checking functionality (July 28, 2025)
- [x] Implemented chatbot status validation before opening chat widget
- [x] Added inactive notification display when user tries to interact with inactive chatbot
- [x] Prevented session creation for inactive chatbots
- [x] Added visual feedback (disabled button state) for inactive chatbots
- [x] Implemented message sending prevention for inactive chatbots
- [x] Added proper error handling and user notification for inactive status

### Enhancement: Chatbot Embed Code Integration
- [x] Added embed code generation and copy functionality to chatbot edit page (July 28, 2025)
- [x] Created HTML iframe embed method with proper positioning and styling
- [x] Created JavaScript embed method for advanced integration
- [x] Added integration instructions and preview page link
- [x] Created dedicated preview page at `/dashboard/chatbots/[id]/preview`
- [x] Implemented responsive device preview (desktop, tablet, mobile)
- [x] Added realistic webpage simulation for testing embed integration
- [x] Updated create chatbot flow to redirect to edit page for immediate access to embed codes

### Bug Fix: ChatbotEdit - primaryColor undefined error
- [x] Fixed "Cannot read properties of undefined (reading 'primaryColor')" error in edit chatbot page (July 25, 2025)
- [x] Added null/undefined checks for config.appearance properties
- [x] Updated updateAppearance function to handle undefined appearance object
- [x] Fixed TypeScript errors related to duplicate property warnings

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
- [x] Create Supabase account and new project
- [x] Create Gemini account and get API keys
- [x] Set up n8n locally via npm (no separate account needed)
- [x] Create Facebook Developer account
- [x] Create WhatsApp Business API account (if needed)


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
**Priority: High | Estimated Time: 4 hours** ✅ **COMPLETED** (July 9, 2025)

- [x] Create new Supabase project through web interface
- [x] Enable pgvector extension in SQL Editor (Dashboard → SQL Editor):
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- [x] Create initial database schema using SQL Editor:
  ```sql
  -- User roles and permissions
  CREATE TABLE user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- User role mappings
  CREATE TABLE user_role_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
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

  CREATE TABLE document_rows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dataset_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    row_data JSONB
  );

  CREATE TABLE n8n_chat_histories (
    id SERIAL PRIMARY KEY,
    session_id CHARACTER VARYING(255) NOT NULL,
    message JSONB NOT NULL
  );
  ```

- [x] Configure Row Level Security (RLS) policies through Authentication → Policies in Dashboard
- [x] Set up Supabase Storage buckets through Storage → Buckets in Dashboard
- [x] Configure CORS settings in API Settings

**Implementation Notes:**
- pgvector extension v0.8.0 successfully enabled
- All tables created with proper UUID primary keys and timestamps
- RLS enabled on all public tables for security
- **RLS Policies**: Comprehensive policies created for all 5 user roles with proper permissions
- **User Roles**: All 5 roles implemented (Super Admin, Knowledge Manager, Chatbot Manager, Analyst/Reporter, Support Agent)
- Vector similarity search index created for document_chunks table
- Foreign key constraints and CASCADE deletes working correctly
- Unit tests created and passed in `tests/database/test_supabase_setup.sql`
- Additional tests for RLS and vector search in `tests/database/test_rls_and_vector_search.sql`

### Task 1.2: n8n Installation and Configuration
**Priority: High | Estimated Time: 3 hours**

**Local npm Installation (Recommended for development)**
- [x] Install n8n globally:
  ```bash
  npm install n8n -g
  ```
- [x] Start n8n locally:
  ```bash
  n8n start
  ```
- [x] Access n8n at http://localhost:5678
- [x] Create initial user account through web interface

**Configuration:**
- [x] Configure environment variables for Gemini API in n8n settings
- [x] Configure Supabase connection credentials in n8n
- [ ] Set up webhooks for workflow triggers
- [x] Test basic workflow creation and execution

**Note**: For production, consider n8n Cloud or self-hosted Docker deployment

### Task 1.3: Next.js Admin Dashboard Setup
**Priority: Medium | Estimated Time: 4 hours**

- [x] Initialize Next.js project with TypeScript:
  ```bash
  npx create-next-app@latest admin-dashboard --typescript --tailwind --eslint --app
  ```

- [x] Install required dependencies:
  ```bash
  npm install @supabase/ssr @supabase/supabase-js
  npm install @headlessui/react @heroicons/react
  npm install react-hook-form zod @hookform/resolvers
  npm install recharts lucide-react
  ```

- [x] Configure Supabase client:
  ```typescript
  // lib/supabase.ts
  import { cookies } from 'next/headers'
  import {
    createBrowserClient,
    createServerClient,
    type CookieOptions,
  } from '@supabase/ssr'

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  /* ---------- Server Client: use only in Server Components / Route Handlers ---------- */
  export const supabaseServer = () => {
    const cookieStore = cookies()          // App-Router <15: sync; 15+: still sync
    return createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get:    (name: string)               => cookieStore.get(name)?.value,
        set:    (name, value, options: CookieOptions) =>
                cookieStore.set({ name, value, ...options }),
        remove: (name,      options: CookieOptions) =>
                cookieStore.set({ name, value: '', ...options }),
      },
    })
  }

  /* ---------- Browser Client: use in Client Components ---------- */
  export const supabaseBrowser = () =>
    createBrowserClient(supabaseUrl, supabaseKey)
  ```

- [x] Set up authentication pages (login, register, forgot password)
- [x] Create basic layout with navigation
- [x] Implement protected route middleware

### Task 1.4: Basic Authentication System
**Priority: High | Estimated Time: 3 hours**

- [x] Configure Supabase Auth settings:
  - Enable email authentication
  - Set up email templates
  - Configure redirect URLs

- [x] Create auth context/provider:
  ```typescript
  // context/AuthContext.tsx
  'use client'

  import {
    createContext, useContext, useEffect, useState, ReactNode,
  } from 'react'
  import { supabaseBrowser } from '@/lib/supabase'
  import type { User } from '@supabase/supabase-js'

  interface AuthCtx {
    user: User | null
    loading: boolean
    signIn:  (email: string, password: string) => Promise<void>
    signUp:  (email: string, password: string) => Promise<void>
    signOut: () => Promise<void>
  }

  const AuthContext = createContext<AuthCtx | undefined>(undefined)

  export function AuthProvider({ children }: { children: ReactNode }) {
    const supabase = supabaseBrowser()
    const [user, setUser]       = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user ?? null)
        setLoading(false)
      })
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_, session) =>
        setUser(session?.user ?? null),
      )
      return () => subscription.unsubscribe()
    }, [supabase])

    const value: AuthCtx = {
      user,
      loading,
      signIn:  (e, p) => supabase.auth.signInWithPassword({ email: e, password: p }).then(() => {}),
      signUp:  (e, p) => supabase.auth.signUp           ({ email: e, password: p }).then(() => {}),
      signOut: ()     => supabase.auth.signOut().then(() => setUser(null)),
    }

    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    )
  }

  export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be within <AuthProvider>')
    return ctx
  }
  ```

- [x] Implement login/logout functionality
- [x] Create role-based access control
- [x] Test authentication flow

## Phase 2: Core RAG System (Week 3-4)

### Task 2.1: Document Processing n8n Workflow
**Priority: High | Estimated Time: 6 hours**

- [x] Create "Document Processing" workflow in n8n:
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
- [x] Set up webhook endpoints for triggering
- [x] Test with various file formats

### Task 2.2: Web Scraping Workflow
**Priority: Medium | Estimated Time: 4 hours**

- [x] Create "Web Scraping" workflow:
  1. **Webhook Trigger**: Receive URL input
  2. **HTTP Request**: Fetch web page content
  3. **HTML Extract**: Extract text content from HTML
  4. **Content Cleaning**: Remove navigation, ads, etc.
  5. **Text Chunking**: Split content appropriately
  6. **Gemini Embeddings**: Generate embeddings
  7. **Supabase Insert**: Store processed content

- [x] Handle different website structures
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
**Priority: Medium | Estimated Time: 5 hours** ✅ **COMPLETED** (July 17, 2025)

- [x] Create knowledge base listing page
- [x] Implement file upload interface with multi-file support
- [x] Add URL input for web scraping with sitemap support
- [x] Create document management interface
- [x] Implement document deletion with embedding cleanup
- [x] Add knowledge base creation and deletion functionality
- [x] Implement role-based access control for knowledge base management
- [x] Add appropriate documentation in `/docs/knowledge-base-api.md`

**Implementation Notes:**
- Created comprehensive UI for Knowledge Base management:
  - Knowledge Base listing page with cards showing document counts
  - Dialog components for creating KBs, uploading files, and adding URLs
  - Document view page for each KB showing all documents
  - Delete confirmations for both KBs and documents
- API endpoints implemented for uploading files, URLs, and sitemaps
- File validation for PDF, DOCX, XLSX, and CSV formats with 20MB limit
- URL and sitemap validation implemented with checkbox toggle
- Storage bucket `chatbot-documents` configured with proper permissions
- n8n webhook integration implemented for processing documents
- Per-file/URL upload progress tracking and status display
- Toast notifications for success/error feedback
- Cascading deletion of documents when KB is deleted
- Storage cleanup when documents or KBs are deleted
- Role-based access restrictions (Super Admin, Knowledge Manager only)

### Bug Fix: Knowledge Base Documents API Authentication & Next.js 15 Compatibility
**Priority: High | Estimated Time: 2 hours** ✅ **COMPLETED** (July 17, 2025)

- [x] Fixed Next.js 15 async params issue in API routes - params must be awaited in server components
- [x] Fixed client component React.use() suspension error - removed unnecessary Promise wrapping
- [x] Fixed authentication in Knowledge Base Documents API routes using proper server-app client
- [x] Updated all knowledge-base API routes to use consistent authentication pattern:
  - Use `createClient()` from `server-app.ts` for authentication (includes cookies)
  - Use `createAdminClient()` from `server.ts` for database operations (bypasses RLS)
- [x] Fixed document deletion API route authentication
- [x] Fixed knowledge base deletion API route async params

**Implementation Notes:**
- API routes now properly handle authentication with cookie-based sessions
- Client components no longer use React.use() for static params
- All async params in API routes are properly awaited
- Super Admin and Knowledge Manager roles can now access documents UI without errors

### Prevention of Processing Document Deletion
**Priority: Medium | Estimated Time: 1 hour** ✅ **COMPLETED** (July 17, 2025)

- [x] Added status checks to prevent deletion of processing documents
- [x] Added status checks to prevent deletion of knowledge bases with processing documents
- [x] Updated API endpoints to return 409 Conflict with descriptive error messages
- [x] Updated frontend error handling to display specific error messages to users

## Phase 3: Basic Chatbot Interface (Week 5-6)

### Task 3.1: Chat Widget Development ✅ **COMPLETED** (July 18, 2025)
**Priority: High | Estimated Time: 6 hours**

- [x] Create embeddable React chat widget with full TypeScript implementation
- [x] Implement real-time messaging with Supabase Realtime subscriptions
- [x] Add typing indicators and message status with loading animations
- [x] Create responsive design for mobile/desktop with proper styling
- [x] Build widget customization options (colors, position, welcome message, etc.)
- [x] Create chat widget Next.js project structure
- [x] Fix UUID validation errors in session management
- [x] Implement proper database relationships (chat_sessions -> chat_messages)
- [x] Create beautiful modern UI with gradients and animations
- [x] Add comprehensive error handling and loading states
- [x] Create demo chatbot in database for testing
- [x] Document n8n integration requirements and API format

**Implementation Notes:**
- Professional modern UI with gradient design and smooth animations
- Proper UUID session management with database relationship handling
- Real-time messaging using Supabase Realtime subscriptions
- Comprehensive error handling and loading states
- Beautiful responsive design suitable for enterprise use
- Complete n8n integration documentation with API specifications
- Demo chatbot created with UUID: f47ac10b-58cc-4372-a567-0e02b2c3d479
- Running successfully at http://localhost:3001
- Ready for n8n workflow integration
- [x] Implement session management and user identification
- [x] Add n8n webhook integration for RAG functionality
- [x] Create embeddable iframe version for website integration
- [x] Add proper error handling and recovery mechanisms
- [x] Implement message persistence in Supabase database
- [x] Add comprehensive TypeScript types for all chat interfaces
- [x] Create documentation for n8n integration requirements

**Implementation Notes:**
- Full Next.js 15 project created in `chat-widget/` folder
- Real-time messaging using Supabase Realtime with PostgreSQL change subscriptions
- Chat widget supports multiple positions (bottom-right, bottom-left, top-right, top-left)
- Session management with persistent user identification using localStorage
- n8n integration via webhook with structured request/response format
- Responsive design with Tailwind CSS and custom theming support
- Embeddable iframe version available at `/embed` endpoint
- Complete TypeScript type definitions for chat messages, sessions, and configuration
- Error handling for network failures, API errors, and database issues
- Database integration with existing `chat_sessions` and `chat_messages` tables
- Created comprehensive documentation in `docs/chat-widget-n8n-integration.md`

### Task 3.2: Chat Session Management n8n Workflow
**Priority: Medium | Estimated Time: 4 hours**

- [x] Create "Chat Session Management" workflow:
  1. **Session Creation**: Initialize new chat sessions
  2. **Message Routing**: Direct messages to appropriate handlers
  3. **Context Management**: Maintain conversation history
  4. **Session Cleanup**: Archive old sessions

- [] Implement user identification and session persistence
- [] Add message rate limiting and spam protection

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

### Task 4.2: Customer Support (Support Agent) Interface
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

## Chatbot Management System
**Priority: High | Estimated Time: 6 hours** ✅ **COMPLETED** (July 25, 2025)

### Task A – Update dashboard navigation
- [x] In layout.tsx, replace "Documents" nav item with "Chatbots"
- [x] Link points to `/dashboard/chatbots`
- [x] Added Bot icon from lucide-react
- [x] No TypeScript errors in layout file

### Task B – Chatbot management pages (CRUD)
- [x] Location: `admin-dashboard/app/dashboard/chatbots`
- [x] Created chatbot role guard component identical to chats RBAC
- [x] Only roles `super_admin` and `chatbot_manager` can access
- [x] **List page**: Shows all chatbots with stats (chat count, last activity)
- [x] **Create page**: Full form with knowledge base selection and widget configuration
- [x] **Edit page**: Update existing chatbot with all configuration options
- [x] **Delete functionality**: Confirmation dialog with cascade deletion warning

### Task C – Chatbot creation form
- [x] Form parameters based on chat-widget README.md configuration:
  - Basic info: name, description, n8n webhook URL
  - Knowledge base selection with multi-select checkboxes
  - Widget configuration: position, welcome message, appearance settings
  - Color picker for primary color, font family selection
  - Border radius customization
- [x] Form validation with required fields and character limits
- [x] Data stored in Supabase `chatbots` table with proper structure
- [x] Error handling and success notifications

### Task D – Integrate preview widget
- [x] Dynamic import of ChatWidget component from `chat-widget` project
- [x] Live preview on right side of form with real-time updates
- [x] Preview shows actual widget behavior matching localhost:3001
- [x] Configuration changes reflected immediately in preview
- [x] Mockup website background with widget overlay
- [x] Preview toggle functionality (show/hide)
- [x] Preview uses actual Supabase credentials for realistic testing

**Implementation Notes:**
- All TypeScript files are error-free
- RBAC properly implemented using existing pattern from chats module
- Supabase integration uses existing chatbots table with proper UUID structure
- ChatWidget preview integrates seamlessly with real component
- Form data includes all parameters from chat-widget README specification
- Preview behavior matches actual widget running on localhost:3001
- Dynamic imports prevent build issues while maintaining functionality
- Complete CRUD operations with proper error handling and user feedback

**Files Created/Modified:**
- `admin-dashboard/app/dashboard/layout.tsx` - Updated navigation
- `admin-dashboard/components/chatbots/chatbot-role-guard.tsx` - RBAC component
- `admin-dashboard/app/dashboard/chatbots/page.tsx` - Chatbot listing
- `admin-dashboard/app/dashboard/chatbots/create/page.tsx` - Creation form with preview
- `admin-dashboard/app/dashboard/chatbots/[id]/edit/page.tsx` - Edit form with preview
- Added shadcn/ui components: alert-dialog, select, switch

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
