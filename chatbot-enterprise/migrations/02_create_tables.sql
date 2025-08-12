-- Create Tables for Enterprise Chatbot System
-- This migration creates all required tables with proper constraints and relationships

-- ====================================================================
-- USER MANAGEMENT TABLES
-- ====================================================================

-- User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
);

-- User Role Mappings Table (One user can have multiple roles, but currently limited to one)
CREATE TABLE IF NOT EXISTS public.user_role_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
);

-- ====================================================================
-- KNOWLEDGE BASE TABLES
-- ====================================================================

-- Knowledge Bases Table
CREATE TABLE IF NOT EXISTS public.knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
);

-- Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    file_path TEXT,
    file_type TEXT,
    status TEXT DEFAULT 'processing',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    schema TEXT  -- For structured data like CSV/Excel
);

-- Document Chunks Table (for RAG vector search)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768),  -- Gemini embedding dimension
    chunk_index INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
);

-- Document Rows Table (for structured data from CSV/Excel files)
CREATE TABLE IF NOT EXISTS public.document_rows (
    id SERIAL PRIMARY KEY,
    dataset_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    row_data JSONB
);

-- ====================================================================
-- CHATBOT MANAGEMENT TABLES
-- ====================================================================

-- Chatbots Table
CREATE TABLE IF NOT EXISTS public.chatbots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    knowledge_base_ids UUID[] DEFAULT '{}',  -- Array of knowledge base IDs
    n8n_webhook_url TEXT,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    session_id UUID PRIMARY KEY,
    chatbot_id UUID REFERENCES public.chatbots(id) ON DELETE SET NULL,
    user_identifier TEXT,  -- Could be Facebook ID, phone number, etc.
    platform TEXT DEFAULT 'web' CHECK (platform IN ('web', 'facebook', 'whatsapp', 'instagram', 'zalo')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
);

-- ====================================================================
-- FACEBOOK INTEGRATION TABLES
-- ====================================================================

-- Facebook Pages Table
CREATE TABLE IF NOT EXISTS public.facebook_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    page_id TEXT NOT NULL UNIQUE,
    page_access_token TEXT NOT NULL,
    app_id TEXT NOT NULL,
    app_secret TEXT NOT NULL,
    verify_token TEXT NOT NULL,
    webhook_url TEXT,
    chatbot_id UUID REFERENCES public.chatbots(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
);

-- Facebook Webhook Logs Table
CREATE TABLE IF NOT EXISTS public.facebook_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id TEXT REFERENCES public.facebook_pages(page_id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    message_text TEXT,
    timestamp_received BIGINT,
    webhook_payload JSONB NOT NULL,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
);

-- ====================================================================
-- N8N INTEGRATION TABLE
-- ====================================================================

-- N8N Chat Histories Table (used by n8n workflows)
CREATE TABLE IF NOT EXISTS public.n8n_chat_histories (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR NOT NULL,
    message JSONB NOT NULL
);

-- ====================================================================
-- INDEXES FOR PERFORMANCE
-- ====================================================================

-- Knowledge Base indexes
CREATE INDEX IF NOT EXISTS idx_documents_knowledge_base_id ON public.documents(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);

-- Vector similarity search index (IVFFlat for better performance with large datasets)
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON public.document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Chat system indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_chatbot_id_v2 ON public.chat_sessions(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_identifier_v2 ON public.chat_sessions(user_identifier);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status_v2 ON public.chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at_v2 ON public.chat_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_v2 ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Facebook integration indexes
CREATE INDEX IF NOT EXISTS idx_facebook_pages_page_id ON public.facebook_pages(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_chatbot_id ON public.facebook_pages(chatbot_id);

CREATE INDEX IF NOT EXISTS idx_facebook_webhook_logs_page_id ON public.facebook_webhook_logs(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_webhook_logs_sender_id ON public.facebook_webhook_logs(sender_id);
CREATE INDEX IF NOT EXISTS idx_facebook_webhook_logs_created_at ON public.facebook_webhook_logs(created_at);

-- User role mapping indexes
CREATE INDEX IF NOT EXISTS idx_user_role_mappings_user_id ON public.user_role_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_mappings_role_id ON public.user_role_mappings(role_id);

COMMENT ON TABLE public.user_roles IS 'Stores user roles for RBAC system';
COMMENT ON TABLE public.user_role_mappings IS 'Maps users to their assigned roles';
COMMENT ON TABLE public.knowledge_bases IS 'Contains knowledge bases for RAG system';
COMMENT ON TABLE public.documents IS 'Stores documents within knowledge bases';
COMMENT ON TABLE public.document_chunks IS 'Text chunks with vector embeddings for RAG';
COMMENT ON TABLE public.document_rows IS 'Structured data rows from CSV/Excel files';
COMMENT ON TABLE public.chatbots IS 'Chatbot configurations and settings';
COMMENT ON TABLE public.chat_sessions IS 'Chat sessions across multiple platforms';
COMMENT ON TABLE public.chat_messages IS 'Individual messages within chat sessions';
COMMENT ON TABLE public.facebook_pages IS 'Facebook Page integration configurations';
COMMENT ON TABLE public.facebook_webhook_logs IS 'Logs of Facebook webhook events';
COMMENT ON TABLE public.n8n_chat_histories IS 'Chat history storage for n8n workflows';
