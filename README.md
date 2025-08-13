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

3. **Set up environment variables in admin-dashboard and chat-widget**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Start all applications**
   
   ```bash
   # Terminal 1: Start n8n
   n8n start
   
   # Terminal 2: Start chat widget
   cd chat-widget
   npm install
   npm run dev
   
   # Terminal 3: Start admin dashboard  
   cd admin-dashboard
   npm install
   npm run dev
   ```

5. **Access the applications**
   - Admin Dashboard: http://localhost:3000
   - Chat Widget: http://localhost:3001  
   - n8n Editor: http://localhost:5678
   
6. **Set up n8n**
   - Open n8n editor at http://localhost:5678
   - Import workflows from `chatbot-enterprise/n8n-workflows/`
   - Configure webhooks and credentials as needed

7. **Database Setup**

   **Important**: Run these SQL migrations in order to set up your Supabase database:

   ```bash
   # Navigate to migrations directory
   cd chatbot-enterprise/migrations
   ```

   **Migration Order:**
   1. **01_enable_extensions.sql** - Enables required PostgreSQL extensions (vector, pgcrypto, uuid-ossp)
   2. **02_create_tables.sql** - Creates all application tables with proper constraints
   3. **03_enable_rls.sql** - Enables Row Level Security with comprehensive RBAC policies  
   4. **04_create_functions_triggers.sql** - Creates utility functions, RAG search functions, and triggers
   5. **05_final_setup.sql** - Final optimizations, indexes, views, and security configurations

   **To apply migrations:**
   1. Open your Supabase project dashboard
   2. Go to SQL Editor
   3. Copy and paste the content of each migration file (in order)
   4. Execute each migration by clicking "Run"
   5. Verify no errors occurred

   **After running migrations:**
   - Create storage bucket `chatbot-documents` in Supabase Dashboard → Storage
   - Set storage policies for file uploads (see [Migrations](./chatbot-enterprise/migrations/README.md) for reference)
   
   **Default User Roles Created:**
   - `Super Admin` - Full system access
   - `Knowledge Manager` - Manage knowledge bases and documents
   - `Chatbot Manager` - Configure chatbots and integrations  
   - `Analyst/Reporter` - View analytics and reports
   - `Support Agent` - Handle customer support escalations

   **First User Setup:**
   After running migrations, register your first user through the admin dashboard, then manually assign the `Super Admin` role via SQL:
   ```sql
   -- Replace 'your-user-id' with the actual user ID from auth.users
   INSERT INTO public.user_role_mappings (user_id, role_id)
   SELECT 'your-user-id', id FROM public.user_roles WHERE name = 'Super Admin';
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
- **Embed Integration**: Ready-to-use iframe and JavaScript embed codes
- **Live Preview**: Test chatbot integration with device simulation
- **Real-time Chat**: Supabase Realtime for instant message delivery

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
The system includes a specialized function for RAG functionality:

**`match_documents`**: Pure vector similarity search

## Admin Dashboard

### Features
- **Authentication**: Supabase Auth with email/password
- **Role-Based Access Control (RBAC)**: User role management
- **Protected Routes**: Dashboard routes protected via middleware
- **Modern UI**: Built with shadcn/ui components using slate theme
- **Fully Typed**: TypeScript for improved developer experience
- **Chatbot Management**: Create, configure, and manage chatbots
- **Embed Code Generation**: Ready-to-use iframe and JavaScript embed codes
- **Live Preview**: Test chatbot integration with device simulation
- **Knowledge Base Integration**: Link chatbots to specific knowledge bases

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

For detailed UI documentation, see [Knowledge Base UI](./chatbot-enterprise/docs/knowledge-base-ui.md).

### API Endpoints

- `GET /api/knowledge-base/list` - List all knowledge bases
- `POST /api/knowledge-base` - Create a new knowledge base
- `DELETE /api/knowledge-base/[id]` - Delete a knowledge base and all its documents
- `POST /api/knowledge-base/upload-file` - Upload file to a knowledge base
- `POST /api/knowledge-base/upload-url` - Add URL or sitemap to a knowledge base
- `GET /api/knowledge-base/documents/[id]` - Get documents for a knowledge base
- `DELETE /api/knowledge-base/document/[id]` - Delete a specific document

For detailed API documentation, see [Knowledge Base API](./chatbot-enterprise/docs/knowledge-base-api.md).

### n8n Integration

Knowledge Base actions trigger n8n workflows via webhooks:
- `/webhook/upload-doc` - Process uploaded documents
- `/webhook/upload-url` - Extract content from URLs and sitemaps

## Chat Widget Embedding

The chat widget can be embedded into any website using iframe or JavaScript integration methods.

### Admin Dashboard Features
- **One-Click Copy**: Generate and copy embed codes directly from the admin dashboard
- **Live Preview**: Test your chatbot integration with device simulation (desktop, tablet, mobile)
- **Custom Configuration**: Configure chatbot settings and appearance
- **Multiple Integration Methods**: Choose between iframe and JavaScript embedding

## 📱 Facebook Messenger Integration

The system includes comprehensive Facebook Messenger integration, allowing your chatbots to automatically respond to messages sent to your Facebook Pages.

### Features
- **Multi-Page Support**: Manage multiple Facebook Pages from a single dashboard
- **Automatic Responses**: Seamless integration with your chatbot's RAG system
- **Secure Webhook Verification**: Facebook-compliant webhook verification and message processing
- **Message Logging**: Complete audit trail of all interactions
- **n8n Integration**: Leverages n8n workflows for advanced message processing

### Setup Requirements
- Facebook Developer App with Messenger product enabled
- Facebook Page with admin access
- Valid Page Access Token and App credentials
- HTTPS webhook URL (use ngrok for local development)

### Admin Dashboard Integration
Access Facebook Messenger configuration through:
- **Main Integration Hub**: `/dashboard/integrations`
- **Facebook Management**: `/dashboard/integrations/facebook`

The integration supports creating, testing, and managing multiple Facebook Page configurations with individual chatbot assignments.

For complete setup instructions, API details, troubleshooting guides, and security considerations, see [Facebook Messenger Integration Documentation](./chatbot-enterprise/docs/facebook-messenger-integration.md).

## 🤝 Contributing

1. Follow the n8n-first philosophy
2. Use TypeScript for all code
3. Test database changes thoroughly
4. Document workflows in n8n-workflows/
5. Update TASKS.md for new features

## 📄 License

This project is proprietary and confidential.

---

**Last Updated**: August 12, 2025
