-- Test Suite for Supabase Project Setup
-- This file contains tests to validate the database schema and functionality

-- Test 1: Verify tables exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('user_roles', 'knowledge_bases', 'documents', 'document_chunks')
ORDER BY table_name, ordinal_position;

-- Test 2: Verify pgvector extension is enabled
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Test 3: Check if RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('user_roles', 'knowledge_bases', 'documents', 'document_chunks');

-- Test 4: Verify vector index exists
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'document_chunks' 
    AND indexname LIKE '%embedding%';

-- Test 5: Test basic CRUD operations
-- Insert test data
INSERT INTO user_roles (name, permissions) VALUES ('Test Role', '{"read": true}');
INSERT INTO knowledge_bases (name, description) VALUES ('Test KB', 'Test description');

-- Verify inserts
SELECT COUNT(*) as user_roles_count FROM user_roles WHERE name = 'Test Role';
SELECT COUNT(*) as knowledge_bases_count FROM knowledge_bases WHERE name = 'Test KB';

-- Test 6: Verify foreign key constraints
-- Get a knowledge base ID for testing
DO $$
DECLARE
    kb_id UUID;
    doc_id UUID;
BEGIN
    SELECT id INTO kb_id FROM knowledge_bases WHERE name = 'Test KB' LIMIT 1;
    
    -- Insert document
    INSERT INTO documents (knowledge_base_id, title, content) 
    VALUES (kb_id, 'Test Document', 'Test content') 
    RETURNING id INTO doc_id;
    
    -- Insert document chunk
    INSERT INTO document_chunks (document_id, content, embedding, chunk_index) 
    VALUES (doc_id, 'Test chunk content', array_fill(0.1, ARRAY[768])::vector, 1);
END $$;

-- Test 7: Test vector similarity search
SELECT 
    id,
    content,
    chunk_index,
    embedding <-> array_fill(0.1, ARRAY[768])::vector AS distance
FROM document_chunks 
ORDER BY embedding <-> array_fill(0.1, ARRAY[768])::vector 
LIMIT 3;

-- Test 8: Verify CASCADE delete works
-- This should delete related documents and chunks
DELETE FROM knowledge_bases WHERE name = 'Test KB';

-- Verify cascade deletion
SELECT COUNT(*) as remaining_docs FROM documents WHERE title = 'Test Document';
SELECT COUNT(*) as remaining_chunks FROM document_chunks WHERE content = 'Test chunk content';

-- Clean up test data
DELETE FROM user_roles WHERE name = 'Test Role';

-- Test Results Summary
SELECT 
    'Tests completed successfully' as status,
    NOW() as timestamp;
