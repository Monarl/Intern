-- Enable Extensions for Enterprise Chatbot System
-- This migration enables required PostgreSQL extensions

-- Enable pgvector extension for vector embeddings (Gemini 768 dimensions)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pgcrypto for password hashing and encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable UUID generation functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgjwt for JWT token handling (if needed for custom auth)
-- CREATE EXTENSION IF NOT EXISTS pgjwt;

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- The extensions are now ready for use in the application
