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

## 🔄 n8n Workflows

The system follows an n8n-first approach with these core workflows:

1. **Document Processing**: File upload → embedding → storage
2. **Web Scraping**: URL → content extraction → embedding
3. **RAG Query**: Query → vector search → LLM response
4. **Facebook Integration**: Social media automation
5. **Human Handoff**: Escalation to support agents

## 📚 Documentation

- [Planning Document](PLANNING.md) - Complete system architecture
- [Task List](TASKS.md) - Development roadmap
- [Module Specifications](Chatbot/Chatbot_DoanhNghiep.md) - Detailed requirements

## 🚦 Development Status

### ✅ Completed (Phase 1)
- [x] Supabase project setup with pgvector
- [x] Database schema creation
- [x] Row Level Security configuration
- [x] Vector search functionality
- [x] Unit tests for database operations

### 🔄 In Progress
- [ ] n8n workflow development
- [ ] Next.js admin dashboard
- [ ] Authentication system

### 📋 Next Steps
1. Complete n8n installation and configuration
2. Build document processing workflow
3. Create admin dashboard interface
4. Implement authentication system

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
