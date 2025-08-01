# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is an enterprise chatbot system with RAG (Retrieval Augmented Generation) capabilities built using a **n8n-first approach**. The system prioritizes n8n workflows to minimize custom coding and maximize automation capabilities.

### Core Components

1. **Supabase Backend** - PostgreSQL database with pgvector extension, authentication, storage, and real-time subscriptions
2. **n8n Workflows** - Automation engine handling business logic, document processing, and RAG queries
3. **Next.js Admin Dashboard** (`admin-dashboard/`) - User management, chatbot configuration, and knowledge base management
4. **Next.js Chat Widget** (`chat-widget/`) - Embeddable chatbot interface for websites
5. **RAG System** - Vector-based knowledge retrieval using Gemini embeddings

### Technology Stack

- **Database**: Supabase PostgreSQL with pgvector extension for vector similarity search
- **Automation**: n8n (local npm installation) 
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS v4, and shadcn/ui components
- **AI/LLM**: Google Gemini 1.5 Pro + Embedding-001 API
- **Authentication**: Supabase Auth with row-level security (RLS)
- **Real-time**: Supabase Realtime subscriptions for live chat

### Key Architectural Principles

- **n8n-First Philosophy**: Business logic implemented in n8n workflows rather than custom code
- **Role-Based Access Control**: Comprehensive RBAC with 5 user roles (Super Admin, Knowledge Manager, Chatbot Manager, Analyst/Reporter, Support Agent)
- **Vector Search**: pgvector with cosine similarity for document retrieval
- **Microservices**: Separate admin dashboard and chat widget applications

## Development Commands

### Admin Dashboard (`chatbot-enterprise/admin-dashboard/`)

```bash
# Development
npm run dev        # Start development server with Turbo
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint code linting

# Port: http://localhost:3000
```

### Chat Widget (`chatbot-enterprise/chat-widget/`)

```bash
# Development  
npm run dev        # Start development server on port 3001
npm run build      # Production build
npm run start      # Start production server on port 3001
npm run lint       # ESLint code linting

# Port: http://localhost:3001
```

### n8n Automation Engine

```bash
# Global installation (one-time setup)
npm install n8n -g

# Start n8n
n8n start

# Access: http://localhost:5678
```

### Full System Startup

The system requires three components running simultaneously:

```bash
# Terminal 1: Start n8n
n8n start

# Terminal 2: Start admin dashboard
cd chatbot-enterprise/admin-dashboard
npm install && npm run dev

# Terminal 3: Start chat widget  
cd chatbot-enterprise/chat-widget
npm install && npm run dev
```

### Testing

The project uses Vitest for testing:

```bash
# Run API tests (from project root)
cd tests/api
# Tests are mocked and require vitest setup
```

## Database Architecture

### Core Tables

- **`user_roles`** - Role-based access control system
- **`knowledge_bases`** - Container for document collections
- **`documents`** - Uploaded files and web content with metadata
- **`document_chunks`** - Text chunks with 768-dimensional vector embeddings

### Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Cascade deletes** for data integrity
- **Owner-based access** with role-based overrides
- **Vector search function**: `match_documents` for RAG queries

## n8n Workflows

Key workflows located in `chatbot-enterprise/n8n-workflows/`:

1. **Document Processing** - File upload → text extraction → embedding → storage
2. **Web Scraping** - URL content extraction with sitemap support
3. **RAG Query Processing** - Query → vector search → LLM response generation
4. **Human Handoff** - Escalation to support agents via email/webhooks

### Webhook Endpoints

- `/webhook/upload-doc` - Process uploaded documents
- `/webhook/upload-url` - Extract content from URLs and sitemaps

## Key Features

### Knowledge Base Management
- Multi-format file upload (PDF, DOCX, XLSX, CSV) with 20MB limit
- URL and sitemap content extraction
- Automatic vector embedding generation
- Role-based access control

### Chat Widget Embedding
- iframe and JavaScript integration methods
- Live preview with device simulation
- One-click embed code generation
- Real-time chat with Supabase subscriptions

### Admin Dashboard
- Comprehensive user role management
- Chatbot configuration and preview
- Knowledge base and document management
- Analytics and chat history (view-only for Analyst role)

## File Organization

```
chatbot-enterprise/
├── admin-dashboard/          # Next.js admin interface
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable UI components
│   └── lib/supabase/        # Supabase client configurations
├── chat-widget/             # Embeddable chat widget
│   └── src/                 # Widget source code
├── n8n-workflows/           # Exported workflow JSON files
├── docs/                    # Implementation documentation
└── tests/                   # Test files (API, database, components)
```

## Development Notes

- Follow TypeScript strict mode for all new code
- Use shadcn/ui components with slate theme for consistency
- Implement proper error handling with toast notifications
- Test all database changes against RLS policies
- Document new workflows in `n8n-workflows/` directory
- Use Vietnamese timezone utilities from `lib/vietnamese-time.ts`