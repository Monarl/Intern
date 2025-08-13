# Database Migration Guide

This guide walks you through setting up the Enterprise Chatbot System database using the provided SQL migration files.

## Prerequisites

- Supabase project created
- Access to Supabase SQL Editor
- Basic understanding of SQL

## Migration Files Overview

The migration files are designed to be run in sequence and will set up a complete enterprise chatbot system with:

- **User Role-Based Access Control (RBAC)**
- **Knowledge Base Management with Vector Embeddings**
- **Multi-platform Chat System**
- **Facebook Messenger Integration**
- **RAG (Retrieval Augmented Generation) Functions**
- **Comprehensive Security Policies**

## Step-by-Step Migration Process

### 1. Enable Extensions (01_enable_extensions.sql)

**Purpose**: Enables required PostgreSQL extensions

**What it does**:
- Enables `vector` extension for embedding storage (768 dimensions for Gemini)
- Enables `pgcrypto` for password hashing
- Enables `uuid-ossp` for UUID generation
- Enables `pg_stat_statements` for performance monitoring

**To apply**:
1. Open Supabase Dashboard → SQL Editor
2. Copy content from `01_enable_extensions.sql`
3. Paste and click "Run"

### 2. Create Tables (02_create_tables.sql)

**Purpose**: Creates all application tables with proper relationships

**What it creates**:
- User management tables (`user_roles`, `user_role_mappings`)
- Knowledge base tables (`knowledge_bases`, `documents`, `document_chunks`)
- Chatbot tables (`chatbots`, `chat_sessions`, `chat_messages`)
- Facebook integration tables (`facebook_pages`, `facebook_webhook_logs`)
- Performance indexes and constraints

**To apply**:
1. Copy content from `02_create_tables.sql`
2. Paste in SQL Editor and run

### 3. Enable Row Level Security (03_enable_rls.sql)

**Purpose**: Implements comprehensive security policies

**What it does**:
- Enables RLS on all tables
- Creates role-based access policies
- Implements owner-based access for Facebook pages
- Allows anonymous access for chat widgets
- Protects sensitive data with proper authorization

**To apply**:
1. Copy content from `03_enable_rls.sql`
2. Paste in SQL Editor and run

### 4. Create Functions and Triggers (04_create_functions_triggers.sql)

**Purpose**: Adds utility functions and RAG search capabilities

**What it creates**:
- Vietnamese timezone utility functions
- RBAC helper functions (`user_has_roles`)
- RAG search functions:
  - `match_document_chunks` - Basic vector similarity search
  - `hybrid_search_chunks` - Combines vector + text search
  - `match_documents` - Advanced search with metadata filtering
  - `get_chunk_context` - Retrieves surrounding chunks
- Trigger functions for automatic timestamps
- Default user roles (Super Admin, Knowledge Manager, etc.)

**To apply**:
1. Copy content from `04_create_functions_triggers.sql`
2. Paste in SQL Editor and run

### 5. Final Setup and Optimizations (05_final_setup.sql)

**Purpose**: Performance optimizations and final configurations

**What it does**:
- Creates additional performance indexes
- Sets up monitoring views
- Configures security permissions
- Creates migration log table
- Provides setup completion summary

**To apply**:
1. Copy content from `05_final_setup.sql`
2. Paste in SQL Editor and run

## Post-Migration Setup

### 1. Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create new bucket named `chatbot-documents`
3. Set it as private (not public)
4. Configure allowed file types: PDF, DOCX, XLSX, CSV, TXT
5. Set file size limit: 20MB

### 2. Set Up First Super Admin User

1. Register a user through your admin dashboard application
2. Find the user ID in `auth.users` table
3. Assign Super Admin role:

```sql
-- Replace 'your-user-id' with actual UUID from auth.users
INSERT INTO public.user_role_mappings (user_id, role_id)
SELECT 'your-user-id', id 
FROM public.user_roles 
WHERE name = 'Super Admin';
```

### 3. Verify Setup

Run this query to verify everything is working:

```sql
-- Check tables exist
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Check default roles created
SELECT name FROM public.user_roles ORDER BY name;
```

## Troubleshooting

### Common Issues

1. **Extension already exists**: Safe to ignore - extensions are created with `IF NOT EXISTS`

2. **Table already exists**: Migration files use `IF NOT EXISTS` - safe to re-run

3. **RLS policy conflicts**: Drop existing policies if you need to re-run:
   ```sql
   DROP POLICY IF EXISTS "policy_name" ON table_name;
   ```

4. **Function already exists**: Use `CREATE OR REPLACE FUNCTION` (already handled in migrations)

### Verification Queries

```sql
-- Check migration log
SELECT * FROM public._migration_log ORDER BY applied_at;

-- Check vector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check sample data
SELECT COUNT(*) FROM public.user_roles;
SELECT COUNT(*) FROM public.user_role_mappings;
```

## System Architecture Overview

After successful migration, your database will support:

- **5 User Roles**: Super Admin, Knowledge Manager, Chatbot Manager, Analyst/Reporter, Support Agent
- **Vector Search**: 768-dimension embeddings for Gemini API
- **Multi-platform Chat**: Web, Facebook, WhatsApp, Instagram, Zalo
- **RAG System**: Advanced search with context retrieval
- **Security**: Comprehensive RLS policies
- **Performance**: Optimized indexes for fast queries

## Next Steps

1. Set up your Next.js applications with database credentials
2. Configure n8n workflows to use the webhook endpoints
3. Set up Facebook Developer App for Messenger integration
4. Test the RAG search functions with sample documents
5. Create knowledge bases and upload documents through the admin dashboard

The database is now ready for production use with the Enterprise Chatbot System!
