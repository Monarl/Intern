# Enterprise Chatbot System

A comprehensive enterprise chatbot system with RAG (Retrieval Augmented Generation) capabilities, built using Supabase + n8n + modern web technologies. The system prioritizes n8n workflows to minimize custom coding and maximize automation capabilities.

## 🏗️ Architecture Overview

### Core Components
1. **Supabase Backend** - Database with pgvector, Auth, Storage, Real-time
2. **n8n Workflows** - Automation engine for business logic
3. **Next.js Admin Dashboard** - User management and configuration
4. **Next.js Chat Widget** - Embeddable chatbot interface
5. **RAG System** - Vector-based knowledge retrieval

### Technology Stack
- **Database**: Supabase PostgreSQL with pgvector extension
- **Automation**: n8n (local npm installation)
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **AI/LLM**: Gemini 1.5 Pro + Embedding-001 API
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chatbot-enterprise
   ```

2. **Install n8n globally**
   ```bash
   npm install n8n -g
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Start n8n**
   ```bash
   n8n start
   # Access at http://localhost:5678
   ```

## 📊 Database Schema

The system uses Supabase PostgreSQL with the following core tables:

### User Management
- `user_roles` - Role-based access control
- `auth.users` - Supabase built-in user management

### Knowledge Base
- `knowledge_bases` - Container for documents
- `documents` - Uploaded files and web content
- `document_chunks` - Text chunks with vector embeddings (768 dimensions)

### Key Features
- **Vector Search**: pgvector extension with cosine similarity
- **Row Level Security**: Enabled on all tables
- **Cascade Deletes**: Maintain data integrity
- **JSONB Metadata**: Flexible schema extension

## 🔧 Project Structure

```
chatbot-enterprise/
├── admin-dashboard/          # Next.js admin interface
├── chat-widget/             # Embeddable chat widget
├── n8n-workflows/           # Exported n8n workflow files
├── docs/                    # Documentation
├── tests/                   # Test files
│   ├── database/           # Database tests
│   ├── components/         # React component tests
│   └── workflows/          # n8n workflow tests
└── .env.example            # Environment variables template
```

## 🔄 n8n Workflows

The system follows an n8n-first approach with these core workflows:

1. **Document Processing**: File upload → embedding → storage
2. **Web Scraping**: URL → content extraction → embedding
3. **RAG Query**: Query → vector search → LLM response
4. **Facebook Integration**: Social media automation
5. **Human Handoff**: Escalation to support agents

## 🧪 Testing

### Database Tests
Run database validation tests:
```bash
# Execute test suite in Supabase SQL Editor
tests/database/test_supabase_setup.sql
```

### Test Results
✅ **All core database tests passed:**
- pgvector extension enabled (v0.8.0)
- All tables created with proper schema
- Row Level Security enabled
- Vector similarity search index created
- Foreign key constraints working
- CASCADE delete operations verified

## 🔐 Security & Access Control

### Row Level Security (RLS)
All database tables have comprehensive RLS policies:

**User Roles System:**
- **Super Admin**: Full system access and user management
- **Knowledge Manager**: Create, edit, delete knowledge bases and documents
- **Chatbot Manager**: Configure chatbots and integrate with platforms
- **Analyst/Reporter**: View-only access to analytics and chat history
- **Support Agent**: Human handoff and customer support functions

**Access Control:**
- Knowledge bases: Owner-based access with role overrides
- Documents: Inherit permissions from knowledge base
- Document chunks: Accessible only through authorized documents
- User roles: Super Admin exclusive management

### Vector Search Functions
The system includes three specialized functions for RAG functionality:

1. **`match_document_chunks()`**: Pure vector similarity search
2. **`hybrid_search_chunks()`**: Combined vector + text search (70% vector, 30% text)
3. **`get_chunk_context()`**: Retrieve surrounding chunks for better context

All functions respect RLS policies and support knowledge base filtering.

## Admin Dashboard

### Features
- **Authentication**: Supabase Auth with email/password
- **Role-Based Access Control (RBAC)**: User role management
- **Protected Routes**: Dashboard routes protected via middleware
- **Modern UI**: Built with shadcn/ui components using slate theme
- **Fully Typed**: TypeScript for improved developer experience

### Environment Variables
Create a `.env.local` file with the following variables:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Getting Started

1. **Navigate to the admin-dashboard directory**
   ```bash
   cd chatbot-enterprise/admin-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)** with your browser.

### Project Structure
```
admin-dashboard/
├── app/                     # Next.js App Router
│   ├── auth/                # Auth callback routes
│   ├── dashboard/           # Protected dashboard routes
│   ├── login/               # Login page
│   ├── register/            # Registration page
│   ├── forgot-password/     # Password recovery
│   └── reset-password/      # Password reset
├── components/              # UI components
├── lib/                     # Utility functions
│   ├── supabase/            # Supabase clients and auth context
│   └── utils/               # Helper functions
└── public/                  # Static assets
```

### Tech Stack
- **Framework**: Next.js 15.3.5 (App Router)
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui (slate theme)
- **Form Handling**: react-hook-form with Zod validation
- **State Management**: React Context API
- **Notifications**: sonner toast

## 🧠 Knowledge Base Management

The Knowledge Base system allows storing and retrieving information from various sources:

### Features

- **Role-Based Access**: Only Super Admins and Knowledge Managers can manage KBs
- **File Upload**: Support for PDF, DOCX, XLSX, and CSV files (max 20MB each)
- **URL Processing**: Extract content from web pages and sitemaps
- **Document Management**: Create, list, and delete documents
- **KB Organization**: Group related documents in separate knowledge bases
- **Storage Integration**: Supabase Storage with `chatbot-documents` bucket
- **Vector Embeddings**: Automatic conversion to Gemini embeddings
- **Cascading Deletion**: Proper cleanup of related data

### User Interface

- **Knowledge Base Listing**: View all knowledge bases with document counts
- **Document Management**: View and delete documents within a knowledge base
- **Multi-file Upload**: Upload multiple files with progress tracking and validation
- **URL Processing**: Add URLs with sitemap detection option
- **Toast Notifications**: Feedback for all operations
- **Status Indicators**: Processing, completed, and error states for documents

For detailed UI documentation, see [Knowledge Base UI](./docs/knowledge-base-ui.md).

### API Endpoints

- `GET /api/knowledge-base/list` - List all knowledge bases
- `POST /api/knowledge-base` - Create a new knowledge base
- `DELETE /api/knowledge-base/[id]` - Delete a knowledge base and all its documents
- `POST /api/knowledge-base/upload-file` - Upload file to a knowledge base
- `POST /api/knowledge-base/upload-url` - Add URL or sitemap to a knowledge base
- `GET /api/knowledge-base/documents/[id]` - Get documents for a knowledge base
- `DELETE /api/knowledge-base/document/[id]` - Delete a specific document

For detailed API documentation, see [Knowledge Base API](./docs/knowledge-base-api.md).

### n8n Integration

Knowledge Base actions trigger n8n workflows via webhooks:
- `/webhook/upload-doc` - Process uploaded documents
- `/webhook/upload-url` - Extract content from URLs and sitemaps

## 🤝 Contributing

1. Follow the n8n-first philosophy
2. Use TypeScript for all code
3. Test database changes thoroughly
4. Document workflows in n8n-workflows/
5. Update TASKS.md for new features

## 📄 License

This project is proprietary and confidential.

---

**Last Updated**: July 9, 2025
**Database Version**: PostgreSQL with pgvector v0.8.0
**n8n Version**: 1.97.1
