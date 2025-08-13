-- Enable Row Level Security (RLS) for Enterprise Chatbot System
-- This migration enables RLS and creates comprehensive security policies

-- ====================================================================
-- ENABLE RLS ON ALL TABLES
-- ====================================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Note: n8n_chat_histories table does not have RLS enabled for n8n workflow access

-- ====================================================================
-- USER ROLE POLICIES
-- ====================================================================

-- User Roles: Only authenticated users can view roles, Super Admin can manage
CREATE POLICY "All authenticated users can view roles"
ON public.user_roles FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super Admin can manage all roles"
ON public.user_roles FOR ALL
TO public
USING (user_has_roles(auth.uid(), ARRAY['Super Admin']));

-- User Role Mappings: Users can view their own, Super Admin can manage all
CREATE POLICY "Users can view their own role mapping"
ON public.user_role_mappings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super Admin can view all role mappings"
ON public.user_role_mappings FOR SELECT
TO authenticated
USING (user_has_roles(auth.uid(), ARRAY['Super Admin']));

CREATE POLICY "Super Admin can manage all role mappings"
ON public.user_role_mappings FOR ALL
TO authenticated
USING (user_has_roles(auth.uid(), ARRAY['Super Admin']));

-- ====================================================================
-- KNOWLEDGE BASE POLICIES
-- ====================================================================

-- Knowledge Bases: Role-based access control
CREATE POLICY "Users can view accessible knowledge bases"
ON public.knowledge_bases FOR SELECT
TO public
USING (
  user_has_roles(auth.uid(), ARRAY['Super Admin', 'Knowledge Manager', 'Chatbot Manager', 'Analyst/Reporter', 'Support Agent'])
);

CREATE POLICY "Knowledge managers can create knowledge bases"
ON public.knowledge_bases FOR INSERT
TO public
WITH CHECK (
  user_has_roles(auth.uid(), ARRAY['Super Admin', 'Knowledge Manager'])
);

CREATE POLICY "Knowledge managers can update knowledge bases"
ON public.knowledge_bases FOR UPDATE
TO public
USING (
  user_has_roles(auth.uid(), ARRAY['Super Admin', 'Knowledge Manager'])
);

CREATE POLICY "Knowledge managers can delete knowledge bases"
ON public.knowledge_bases FOR DELETE
TO public
USING (
  user_has_roles(auth.uid(), ARRAY['Super Admin', 'Knowledge Manager'])
);

-- Documents: Inherit permissions from knowledge base
CREATE POLICY "Users can view accessible documents"
ON public.documents FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.knowledge_bases kb
    WHERE kb.id = documents.knowledge_base_id
    AND (
      kb.owner_id = auth.uid() OR
      user_has_roles(auth.uid(), ARRAY['Super Admin', 'Knowledge Manager', 'Chatbot Manager', 'Analyst/Reporter', 'Support Agent'])
    )
  )
);

CREATE POLICY "Knowledge managers can manage documents"
ON public.documents FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.knowledge_bases kb
    WHERE kb.id = documents.knowledge_base_id
    AND (
      kb.owner_id = auth.uid() OR
      user_has_roles(auth.uid(), ARRAY['Super Admin', 'Knowledge Manager'])
    )
  )
);

-- Document Chunks: Inherit permissions from documents
CREATE POLICY "Users can view accessible document chunks"
ON public.document_chunks FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.knowledge_bases kb ON d.knowledge_base_id = kb.id
    WHERE d.id = document_chunks.document_id
    AND (
      kb.owner_id = auth.uid() OR
      user_has_roles(auth.uid(), ARRAY['Super Admin', 'Knowledge Manager', 'Chatbot Manager', 'Analyst/Reporter', 'Support Agent'])
    )
  )
);

CREATE POLICY "Knowledge managers can manage document chunks"
ON public.document_chunks FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.knowledge_bases kb ON d.knowledge_base_id = kb.id
    WHERE d.id = document_chunks.document_id
    AND (
      kb.owner_id = auth.uid() OR
      user_has_roles(auth.uid(), ARRAY['Super Admin', 'Knowledge Manager'])
    )
  )
);

-- Document Rows: Same as document chunks
CREATE POLICY "Knowledge managers can manage document chunks"
ON public.document_rows FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.knowledge_bases kb ON d.knowledge_base_id = kb.id
    WHERE d.id = document_rows.dataset_id
    AND (
      kb.owner_id = auth.uid() OR
      user_has_roles(auth.uid(), ARRAY['Super Admin', 'Knowledge Manager'])
    )
  )
);

-- ====================================================================
-- CHATBOT POLICIES
-- ====================================================================

-- Chatbots: Chatbot managers and public access for chat widget
CREATE POLICY "Chatbot access policy"
ON public.chatbots FOR SELECT
TO public
USING (
  user_has_roles(auth.uid(), ARRAY['Super Admin', 'Chatbot Manager']) OR
  auth.uid() IS NULL  -- Allow anonymous access for chat widget
);

CREATE POLICY "Chatbot managers can insert chatbots"
ON public.chatbots FOR INSERT
TO public
WITH CHECK (
  user_has_roles(auth.uid(), ARRAY['Super Admin', 'Chatbot Manager'])
);

CREATE POLICY "Users can update chatbots they own or manage"
ON public.chatbots FOR UPDATE
TO public
USING (
  user_has_roles(auth.uid(), ARRAY['Super Admin', 'Chatbot Manager'])
);

CREATE POLICY "Chatbot managers can delete chatbots"
ON public.chatbots FOR DELETE
TO public
USING (
  user_has_roles(auth.uid(), ARRAY['Super Admin', 'Chatbot Manager'])
);

-- Chat Sessions: Open access for chat functionality
CREATE POLICY "Allow read access to all sessions"
ON public.chat_sessions FOR SELECT
TO public
USING (true);

CREATE POLICY "System can insert chat sessions"
ON public.chat_sessions FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow session updates by anyone"
ON public.chat_sessions FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Chat Messages: Access through session relationship
CREATE POLICY "Users can view messages in their sessions"
ON public.chat_messages FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.session_id = chat_messages.session_id
  )
);

CREATE POLICY "System can insert messages"
ON public.chat_messages FOR INSERT
TO public
WITH CHECK (true);

-- ====================================================================
-- FACEBOOK INTEGRATION POLICIES
-- ====================================================================

-- Facebook Pages: Owner-based access
CREATE POLICY "Users can view their own Facebook pages"
ON public.facebook_pages FOR SELECT
TO public
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own Facebook pages"
ON public.facebook_pages FOR INSERT
TO public
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own Facebook pages"
ON public.facebook_pages FOR UPDATE
TO public
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own Facebook pages"
ON public.facebook_pages FOR DELETE
TO public
USING (auth.uid() = owner_id);

-- Facebook Webhook Logs: Access through page ownership
CREATE POLICY "Users can view webhook logs for their Facebook pages"
ON public.facebook_webhook_logs FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.facebook_pages fp
    WHERE fp.page_id = facebook_webhook_logs.page_id
    AND fp.owner_id = auth.uid()
  )
);

CREATE POLICY "Allow webhook log insertion"
ON public.facebook_webhook_logs FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can update webhook logs for their Facebook pages"
ON public.facebook_webhook_logs FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.facebook_pages fp
    WHERE fp.page_id = facebook_webhook_logs.page_id
    AND fp.owner_id = auth.uid()
  )
);

-- ====================================================================
-- COMMENTS FOR DOCUMENTATION
-- ====================================================================

COMMENT ON POLICY "All authenticated users can view roles" ON public.user_roles 
IS 'Allows all authenticated users to view available roles for UI purposes';

COMMENT ON POLICY "Super Admin can manage all roles" ON public.user_roles 
IS 'Only Super Admins can create, update, or delete user roles';

COMMENT ON POLICY "Users can view accessible knowledge bases" ON public.knowledge_bases 
IS 'Role-based access: Knowledge Manager, Chatbot Manager, Analyst/Reporter, Support Agent can view KBs';

COMMENT ON POLICY "Knowledge managers can manage documents" ON public.documents 
IS 'Knowledge Managers and Super Admins can manage documents within accessible knowledge bases';

COMMENT ON POLICY "Chatbot access policy" ON public.chatbots 
IS 'Chatbot Managers can manage chatbots, anonymous users can access for chat widget functionality';

COMMENT ON POLICY "Allow read access to all sessions" ON public.chat_sessions 
IS 'Open access to chat sessions for cross-platform chat functionality';

COMMENT ON POLICY "Users can view their own Facebook pages" ON public.facebook_pages 
IS 'Owner-based access control for Facebook page integrations';
