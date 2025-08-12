-- Create Functions and Triggers for Enterprise Chatbot System
-- This migration creates utility functions, RAG search functions, and triggers

-- ====================================================================
-- UTILITY FUNCTIONS
-- ====================================================================

-- Vietnamese timezone functions
CREATE OR REPLACE FUNCTION public.vietnam_now()
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE SQL
STABLE
AS $$
  SELECT NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh';
$$;

CREATE OR REPLACE FUNCTION public.vietnam_date()
RETURNS DATE
LANGUAGE SQL
STABLE
AS $$
  SELECT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
$$;

CREATE OR REPLACE FUNCTION public.to_vietnam_time(input_timestamp TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT input_timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';
$$;

CREATE OR REPLACE FUNCTION public.format_vietnam_time(input_timestamp TIMESTAMP WITH TIME ZONE)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT to_char(input_timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI:SS');
$$;

-- ====================================================================
-- RBAC HELPER FUNCTIONS
-- ====================================================================

-- Function to check if user has specific roles
CREATE OR REPLACE FUNCTION public.user_has_roles(uid UUID, role_names TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_role_mappings urm
      JOIN public.user_roles       ur
        ON ur.id = urm.role_id
     WHERE urm.user_id = uid
       AND ur.name = ANY(role_names)
  );
$$;

-- ====================================================================
-- RAG SEARCH FUNCTIONS
-- ====================================================================

-- Basic vector similarity search for document chunks
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector,
  knowledge_base_ids UUID[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  document_id UUID,
  content TEXT,
  chunk_index INT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    (knowledge_base_ids IS NULL OR d.knowledge_base_id = ANY(knowledge_base_ids))
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid search combining vector similarity and text search
CREATE OR REPLACE FUNCTION public.hybrid_search_chunks(
  query_embedding vector,
  query_text TEXT DEFAULT NULL,
  knowledge_base_ids UUID[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  document_id UUID,
  content TEXT,
  chunk_index INT,
  metadata JSONB,
  similarity FLOAT,
  text_rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity,
    CASE 
      WHEN query_text IS NOT NULL THEN
        ts_rank_cd(to_tsvector('english', dc.content), plainto_tsquery('english', query_text))
      ELSE 0
    END as text_rank
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    (knowledge_base_ids IS NULL OR d.knowledge_base_id = ANY(knowledge_base_ids))
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (query_text IS NULL OR to_tsvector('english', dc.content) @@ plainto_tsquery('english', query_text))
  ORDER BY 
    (1 - (dc.embedding <=> query_embedding)) * 0.7 + 
    CASE 
      WHEN query_text IS NOT NULL THEN
        ts_rank_cd(to_tsvector('english', dc.content), plainto_tsquery('english', query_text)) * 0.3
      ELSE 0
    END DESC
  LIMIT match_count;
END;
$$;

-- Advanced search function with flexible metadata filtering
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector,
  match_count integer DEFAULT NULL,
  filter jsonb DEFAULT '{}'
)
RETURNS TABLE(
  id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
/*
  Behaviour
  ─────────
  • Simple KV pairs   → still use  metadata @> filter
  • Array values      → turn into  (metadata ->> key) = ANY(array)
    (works for one or many keys that have arrays)
*/
declare
  filter_scalar jsonb := '{}'::jsonb;  -- parts we'll keep for @> containment
  sql_parts     text   := '';          -- dynamic pieces for array predicates
  pair          record;
begin
  -- 1. Walk through every key in 'filter'
FOR pair IN SELECT * FROM jsonb_each(filter) LOOP
  IF jsonb_typeof(pair.value) = 'array' THEN
    ------------------------------------------------------------------
    -- NEW: skip this key when the array is empty  ───────────────────
    ------------------------------------------------------------------
    IF jsonb_array_length(pair.value) = 0 THEN
      CONTINUE;                          -- ← don't add any predicate
    END IF;
    ------------------------------------------------------------------
    -- Build "(metadata ->> 'key') = ANY(ARRAY[...])"
    sql_parts := sql_parts ||
      format(
        ' AND (metadata ->> %L) = ANY(%L::text[])',
        pair.key,
        array(
          SELECT jsonb_array_elements_text(pair.value)
        )
      );
  ELSE
    -- Keep simple KV in the scalar filter
    filter_scalar := filter_scalar || jsonb_build_object(pair.key, pair.value);
  END IF;
END LOOP;

  -- 2. Run the similarity search with both kinds of predicates
  return query execute
    format(
      $$
      select
          id,
          content,
          metadata,
          1 - (embedding <=> $1) as similarity
      from   document_chunks
      where  metadata @> $2  -- scalar kv filter
            %s              -- any array predicates
      order  by embedding <=> $1
      limit  $3
      $$, sql_parts
    )
    using query_embedding, filter_scalar, match_count;
end;
$$;

-- Function to get context around a specific chunk
CREATE OR REPLACE FUNCTION public.get_chunk_context(
  chunk_id UUID,
  context_size INT DEFAULT 2
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  chunk_index INT,
  is_target BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  target_doc_id UUID;
  target_chunk_index INT;
BEGIN
  -- Get the document and chunk index of the target chunk
  SELECT document_id, chunk_index INTO target_doc_id, target_chunk_index
  FROM document_chunks
  WHERE document_chunks.id = chunk_id;
  
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.chunk_index,
    dc.id = chunk_id as is_target
  FROM document_chunks dc
  WHERE 
    dc.document_id = target_doc_id
    AND dc.chunk_index BETWEEN 
      (target_chunk_index - context_size) AND 
      (target_chunk_index + context_size)
  ORDER BY dc.chunk_index;
END;
$$;

-- ====================================================================
-- TRIGGER FUNCTIONS
-- ====================================================================

-- Generic function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Function to update chat session when message is inserted
CREATE OR REPLACE FUNCTION public.update_session_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the session's updated_at timestamp when a message is inserted
  -- Use Vietnamese timezone
  UPDATE chat_sessions 
  SET updated_at = NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'
  WHERE session_id = NEW.session_id;
  
  RETURN NEW;
END;
$$;

-- Function to update Facebook pages updated_at with Vietnamese timezone
CREATE OR REPLACE FUNCTION public.update_facebook_pages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh');
    RETURN NEW;
END;
$$;

-- Function to update chat session updated_at
CREATE OR REPLACE FUNCTION public.update_chat_session_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ====================================================================
-- CREATE TRIGGERS
-- ====================================================================

-- Trigger to automatically update session when message is inserted
CREATE OR REPLACE TRIGGER trigger_update_session_on_message
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_session_on_message();

-- Trigger to update Facebook pages updated_at timestamp
CREATE OR REPLACE TRIGGER trigger_update_facebook_pages_updated_at
    BEFORE UPDATE ON public.facebook_pages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_facebook_pages_updated_at();

-- ====================================================================
-- COMMENTS FOR DOCUMENTATION
-- ====================================================================

COMMENT ON FUNCTION public.vietnam_now() IS 'Returns current timestamp in Vietnamese timezone';
COMMENT ON FUNCTION public.vietnam_date() IS 'Returns current date in Vietnamese timezone';
COMMENT ON FUNCTION public.user_has_roles(UUID, TEXT[]) IS 'Security definer function to check user roles for RLS policies';
COMMENT ON FUNCTION public.match_document_chunks(vector, UUID[], FLOAT, INT) IS 'Basic vector similarity search for RAG functionality';
COMMENT ON FUNCTION public.hybrid_search_chunks(vector, TEXT, UUID[], FLOAT, INT) IS 'Hybrid search combining vector similarity and full-text search';
COMMENT ON FUNCTION public.match_documents(vector, INT, JSONB) IS 'Advanced search with flexible metadata filtering including array support';
COMMENT ON FUNCTION public.get_chunk_context(UUID, INT) IS 'Retrieves surrounding chunks for better context in RAG responses';
COMMENT ON FUNCTION public.update_session_on_message() IS 'Trigger function to update chat session timestamp when new message is added';
COMMENT ON FUNCTION public.update_facebook_pages_updated_at() IS 'Trigger function to update Facebook pages with Vietnamese timezone';

-- ====================================================================
-- SEED DATA FOR INITIAL SETUP
-- ====================================================================

-- Insert default user roles
INSERT INTO public.user_roles (name, permissions) VALUES
('Super Admin', '{"manage_users": true, "manage_roles": true, "manage_knowledge_bases": true, "manage_chatbots": true, "view_analytics": true, "manage_integrations": true}'),
('Knowledge Manager', '{"manage_knowledge_bases": true, "view_analytics": true}'),
('Chatbot Manager', '{"manage_chatbots": true, "view_analytics": true, "manage_integrations": true}'),
('Analyst/Reporter', '{"view_analytics": true}'),
('Support Agent', '{"handle_escalations": true, "view_chat_history": true}')
ON CONFLICT (name) DO NOTHING;

-- Note: User role mappings should be created through the application interface
-- The first user to register should be manually assigned Super Admin role

COMMENT ON TABLE public.user_roles IS 'Default user roles: Super Admin, Knowledge Manager, Chatbot Manager, Analyst/Reporter, Support Agent';
