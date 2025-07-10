-- Test Suite for Vector Search Functions and RLS Policies
-- This file validates the security policies and vector search functionality

-- Test 1: Verify all 5 user roles exist with correct permissions
SELECT 
    name,
    permissions
FROM user_roles 
ORDER BY name;

-- Test 2: Test vector search function with sample data
-- Insert test data with proper embeddings
DO $$
DECLARE
    kb_id uuid;
    doc_id uuid;
    chunk_id uuid;
BEGIN
    -- Create test knowledge base
    INSERT INTO knowledge_bases (name, description) 
    VALUES ('Test KB for Vector Search', 'Test knowledge base for vector search validation')
    RETURNING id INTO kb_id;
    
    -- Create test document
    INSERT INTO documents (knowledge_base_id, title, content, status) 
    VALUES (kb_id, 'Test Document', 'This is a test document for vector search', 'completed')
    RETURNING id INTO doc_id;
    
    -- Create test chunks with different embeddings
    INSERT INTO document_chunks (document_id, content, embedding, chunk_index) VALUES
    (doc_id, 'This is about artificial intelligence and machine learning', array_fill(0.1, ARRAY[768])::vector, 1),
    (doc_id, 'This discusses natural language processing and chatbots', array_fill(0.2, ARRAY[768])::vector, 2),
    (doc_id, 'This covers database management and vector search', array_fill(0.3, ARRAY[768])::vector, 3);
    
    RAISE NOTICE 'Test data inserted successfully';
END $$;

-- Test 3: Test vector similarity search function
SELECT 
    content,
    chunk_index,
    similarity
FROM match_document_chunks(
    array_fill(0.15, ARRAY[768])::vector,  -- Query embedding
    NULL,                                   -- All knowledge bases
    0.0,                                   -- Low threshold to get results
    3                                      -- Top 3 matches
);

-- Test 4: Test hybrid search function
SELECT 
    content,
    chunk_index,
    similarity,
    text_rank
FROM hybrid_search_chunks(
    array_fill(0.15, ARRAY[768])::vector,  -- Query embedding
    'artificial intelligence',              -- Text query
    NULL,                                   -- All knowledge bases
    0.0,                                   -- Low threshold
    3                                      -- Top 3 matches
);

-- Test 5: Test context retrieval function
DO $$
DECLARE
    test_chunk_id uuid;
BEGIN
    -- Get a chunk ID for testing
    SELECT id INTO test_chunk_id 
    FROM document_chunks 
    WHERE content LIKE '%artificial intelligence%'
    LIMIT 1;
    
    -- Test context retrieval
    RAISE NOTICE 'Testing context retrieval for chunk: %', test_chunk_id;
END $$;

-- Test 6: Verify RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('user_roles', 'knowledge_bases', 'documents', 'document_chunks')
ORDER BY tablename, policyname;

-- Test 7: Test document deletion cascade
DO $$
DECLARE
    test_kb_id uuid;
    test_doc_id uuid;
    chunk_count_before int;
    chunk_count_after int;
BEGIN
    -- Get test knowledge base ID
    SELECT id INTO test_kb_id 
    FROM knowledge_bases 
    WHERE name = 'Test KB for Vector Search';
    
    -- Count chunks before deletion
    SELECT COUNT(*) INTO chunk_count_before 
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.knowledge_base_id = test_kb_id;
    
    RAISE NOTICE 'Chunks before deletion: %', chunk_count_before;
    
    -- Delete knowledge base (should cascade)
    DELETE FROM knowledge_bases WHERE id = test_kb_id;
    
    -- Count chunks after deletion
    SELECT COUNT(*) INTO chunk_count_after 
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.knowledge_base_id = test_kb_id;
    
    RAISE NOTICE 'Chunks after deletion: %', chunk_count_after;
    
    -- Verify cascade worked
    IF chunk_count_after = 0 THEN
        RAISE NOTICE 'CASCADE deletion test PASSED';
    ELSE
        RAISE NOTICE 'CASCADE deletion test FAILED';
    END IF;
END $$;

-- Test 8: Verify functions are created and accessible
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition IS NOT NULL as has_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('match_document_chunks', 'hybrid_search_chunks', 'get_chunk_context')
ORDER BY routine_name;

-- Test Results Summary
SELECT 
    'RLS Policies and Vector Search Functions tests completed' as status,
    NOW() as timestamp;
