-- Final Setup and Optimizations for Enterprise Chatbot System
-- This migration includes additional configurations, optimizations, and storage setup

-- ====================================================================
-- STORAGE BUCKET CREATION (for Supabase Storage)
-- ====================================================================

-- Note: Storage buckets are typically created through Supabase Dashboard
-- These are the SQL commands equivalent to dashboard actions:

-- Create storage bucket for chatbot documents
-- INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
-- VALUES (
--   'chatbot-documents',
--   'chatbot-documents',
--   false,
--   ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
--         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'text/plain'],
--   20971520  -- 20MB limit
-- );

-- Create RLS policies for storage bucket
-- CREATE POLICY "Authenticated users can upload files"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'chatbot-documents');

-- CREATE POLICY "Users can view their uploaded files"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'chatbot-documents');

-- CREATE POLICY "Users can delete their uploaded files"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'chatbot-documents');

-- ====================================================================
-- ADDITIONAL INDEXES FOR OPTIMIZATION
-- ====================================================================

-- Full-text search indexes for document content
CREATE INDEX IF NOT EXISTS idx_documents_content_fts 
ON public.documents USING gin(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_document_chunks_content_fts 
ON public.document_chunks USING gin(to_tsvector('english', content));

-- Metadata JSONB indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_documents_metadata_gin 
ON public.documents USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata_gin 
ON public.document_chunks USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_chatbots_config_gin 
ON public.chatbots USING gin(config);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_metadata_gin 
ON public.chat_sessions USING gin(metadata);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_documents_status 
ON public.documents(status);

CREATE INDEX IF NOT EXISTS idx_documents_file_type 
ON public.documents(file_type);

CREATE INDEX IF NOT EXISTS idx_chatbots_is_active 
ON public.chatbots(is_active);

CREATE INDEX IF NOT EXISTS idx_facebook_pages_is_active 
ON public.facebook_pages(is_active);

-- ====================================================================
-- VACUUM AND ANALYZE FOR PERFORMANCE
-- ====================================================================

-- Analyze tables for query optimization
ANALYZE public.user_roles;
ANALYZE public.user_role_mappings;
ANALYZE public.knowledge_bases;
ANALYZE public.documents;
ANALYZE public.document_chunks;
ANALYZE public.document_rows;
ANALYZE public.chatbots;
ANALYZE public.chat_sessions;
ANALYZE public.chat_messages;
ANALYZE public.facebook_pages;
ANALYZE public.facebook_webhook_logs;
ANALYZE public.n8n_chat_histories;

-- ====================================================================
-- CUSTOM TYPES AND ENUMS (if needed for future expansion)
-- ====================================================================

-- Create custom enum types for better data integrity
-- CREATE TYPE public.chat_platform AS ENUM ('web', 'facebook', 'whatsapp', 'instagram', 'zalo');
-- CREATE TYPE public.chat_status AS ENUM ('active', 'completed', 'abandoned');
-- CREATE TYPE public.message_role AS ENUM ('user', 'assistant', 'system');
-- CREATE TYPE public.document_status AS ENUM ('processing', 'completed', 'failed');
-- CREATE TYPE public.webhook_status AS ENUM ('pending', 'processed', 'failed');

-- Note: Current implementation uses TEXT with CHECK constraints for flexibility
-- Future migrations can convert to ENUMs if stricter type safety is required

-- ====================================================================
-- PERFORMANCE MONITORING VIEWS
-- ====================================================================

-- View for monitoring vector search performance
CREATE OR REPLACE VIEW public.vector_search_stats AS
SELECT 
    'document_chunks' as table_name,
    COUNT(*) as total_rows,
    COUNT(embedding) as rows_with_embeddings,
    ROUND(AVG(vector_dims(embedding))::numeric, 2) as avg_embedding_dimensions
FROM public.document_chunks
WHERE embedding IS NOT NULL;

-- View for knowledge base statistics
CREATE OR REPLACE VIEW public.knowledge_base_stats AS
SELECT 
    kb.id,
    kb.name,
    kb.owner_id,
    COUNT(DISTINCT d.id) as document_count,
    COUNT(dc.id) as chunk_count,
    SUM(LENGTH(dc.content)) as total_content_length,
    kb.created_at
FROM public.knowledge_bases kb
LEFT JOIN public.documents d ON kb.id = d.knowledge_base_id
LEFT JOIN public.document_chunks dc ON d.id = dc.document_id
GROUP BY kb.id, kb.name, kb.owner_id, kb.created_at
ORDER BY kb.created_at DESC;

-- View for chatbot activity statistics
CREATE OR REPLACE VIEW public.chatbot_activity_stats AS
SELECT 
    c.id,
    c.name,
    c.is_active,
    COUNT(DISTINCT cs.session_id) as total_sessions,
    COUNT(cm.id) as total_messages,
    MAX(cs.updated_at) as last_activity,
    c.created_at
FROM public.chatbots c
LEFT JOIN public.chat_sessions cs ON c.id = cs.chatbot_id
LEFT JOIN public.chat_messages cm ON cs.session_id = cm.session_id
GROUP BY c.id, c.name, c.is_active, c.created_at
ORDER BY last_activity DESC NULLS LAST;

-- ====================================================================
-- SECURITY CONFIGURATIONS
-- ====================================================================

-- Grant necessary permissions to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant limited permissions to anon for chat widget functionality
GRANT SELECT ON public.chatbots TO anon;
GRANT SELECT, INSERT ON public.chat_sessions TO anon;
GRANT SELECT, INSERT ON public.chat_messages TO anon;
GRANT INSERT ON public.facebook_webhook_logs TO anon;

-- Ensure RLS is properly configured
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_mappings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_bases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.document_rows FORCE ROW LEVEL SECURITY;
ALTER TABLE public.chatbots FORCE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_pages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_webhook_logs FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- FINAL COMMENTS AND DOCUMENTATION
-- ====================================================================

COMMENT ON SCHEMA public IS 'Enterprise Chatbot System - Main application schema with RAG, multi-platform chat, and RBAC';

COMMENT ON VIEW public.vector_search_stats IS 'Monitoring view for vector embedding statistics';
COMMENT ON VIEW public.knowledge_base_stats IS 'Statistics view for knowledge base content and usage';
COMMENT ON VIEW public.chatbot_activity_stats IS 'Activity statistics for chatbot usage and engagement';

-- ====================================================================
-- MIGRATION COMPLETION LOG
-- ====================================================================

-- Create a simple migration log table to track applied migrations
CREATE TABLE IF NOT EXISTS public._migration_log (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- Insert migration records
INSERT INTO public._migration_log (migration_name, description) VALUES
('01_enable_extensions', 'Enabled required PostgreSQL extensions (vector, pgcrypto, uuid-ossp, pg_stat_statements)'),
('02_create_tables', 'Created all application tables with proper constraints and relationships'),
('03_enable_rls', 'Enabled Row Level Security with comprehensive RBAC policies'),
('04_create_functions_triggers', 'Created utility functions, RAG search functions, and triggers'),
('05_final_setup', 'Final optimizations, indexes, views, and security configurations')
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Enterprise Chatbot System database migration completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create storage bucket "chatbot-documents" in Supabase Dashboard';
    RAISE NOTICE '2. Configure storage policies for file uploads';
    RAISE NOTICE '3. Set up environment variables in your applications';
    RAISE NOTICE '4. Create your first Super Admin user through the application';
    RAISE NOTICE 'Database is ready for n8n workflows and Next.js applications!';
END $$;
