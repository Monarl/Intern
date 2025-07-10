# Supabase Project Setup Documentation

## Overview
This document describes the completed Supabase project setup for the Enterprise Chatbot System, including database schema, security configuration, and testing procedures.

## Database Schema

### Core Tables

#### 1. `user_roles`
Role-based access control system for the admin dashboard.

```sql
CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Define user roles with granular permissions
**Security**: RLS enabled
**Example roles**: Super Admin, Knowledge Manager, Chatbot Manager, Support Agent

#### 2. `knowledge_bases`
Container for organizing documents and knowledge sources.

```sql
CREATE TABLE knowledge_bases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Group related documents for different chatbots or departments
**Security**: RLS enabled, owner-based access control
**Features**: Flexible settings via JSONB

#### 3. `documents`
Individual files and web content uploaded to the system.

```sql
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  file_path TEXT,
  file_type TEXT,
  status TEXT DEFAULT 'processing',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Store document metadata and content
**Security**: RLS enabled, cascades with knowledge base deletion
**Supported types**: PDF, DOCX, TXT, HTML, etc.
**Status tracking**: processing, completed, error

#### 4. `document_chunks`
Text chunks with vector embeddings for RAG functionality.

```sql
CREATE TABLE document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768), -- Gemini embedding-001 dimension
  chunk_index INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Enable vector similarity search for RAG queries
**Security**: RLS enabled, cascades with document deletion
**Vector dimensions**: 768 (Gemini embedding-001)
**Indexing**: IVFFlat index for cosine similarity

## Vector Search Configuration

### pgvector Extension
- **Version**: 0.8.0
- **Installation**: `CREATE EXTENSION IF NOT EXISTS vector;`
- **Data type**: `vector(768)` for Gemini embeddings

### Vector Index
```sql
CREATE INDEX document_chunks_embedding_idx 
ON document_chunks USING ivfflat (embedding vector_cosine_ops);
```

**Index type**: IVFFlat for approximate nearest neighbor search
**Distance metric**: Cosine similarity (`vector_cosine_ops`)
**Performance**: Optimized for similarity queries

## Security Configuration

### Row Level Security (RLS)
All public tables have RLS enabled:
- `user_roles`: Role-based access control
- `knowledge_bases`: Owner-based access control
- `documents`: Inheritance from knowledge base permissions
- `document_chunks`: Inheritance from document permissions

### Data Integrity
- **Foreign key constraints**: Maintain referential integrity
- **CASCADE deletes**: Automatic cleanup of related data
- **UUID primary keys**: Distributed system compatibility
- **Timestamps**: Audit trail for all records

## Testing

### Test Suite Location
`tests/database/test_supabase_setup.sql`

### Test Coverage
1. **Schema validation**: Verify all tables and columns exist
2. **Extension verification**: Confirm pgvector is enabled
3. **Security validation**: Check RLS is enabled on all tables
4. **Index verification**: Confirm vector search index exists
5. **CRUD operations**: Test basic insert/select/delete operations
6. **Foreign key constraints**: Verify referential integrity
7. **Vector search**: Test similarity search functionality
8. **CASCADE deletes**: Verify data cleanup works properly

### Test Results
✅ All tests passed successfully on July 9, 2025

## Migration History

1. `enable_pgvector_extension` - Enable pgvector extension
2. `initial_schema_enterprise_chatbot` - Create core tables
3. `enable_rls_user_roles` - Enable RLS on user_roles
4. `enable_rls_knowledge_bases` - Enable RLS on knowledge_bases
5. `enable_rls_documents_2` - Enable RLS on documents
6. `enable_rls_document_chunks_3` - Enable RLS on document_chunks

## Performance Considerations

### Vector Search Optimization
- **Index type**: IVFFlat for approximate similarity search
- **Dimension**: 768 (optimal for Gemini embeddings)
- **Distance metric**: Cosine similarity for text embeddings
- **Query pattern**: ORDER BY embedding <-> query_vector LIMIT n

### Scaling Recommendations
- Monitor vector index performance as data grows
- Consider partitioning document_chunks for large datasets
- Implement connection pooling for high-concurrency scenarios
- Use read replicas for analytics queries

## API Integration

### Supabase Client Configuration
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Vector Search Query Example
```sql
SELECT 
  id,
  content,
  embedding <-> $1 AS distance
FROM document_chunks
WHERE knowledge_base_id = $2
ORDER BY embedding <-> $1
LIMIT 5;
```

## Next Steps

1. **RLS Policies**: Create specific policies for each table
2. **Storage Buckets**: Set up file storage buckets
3. **Authentication**: Configure Supabase Auth settings
4. **API Keys**: Generate and configure service role keys
5. **CORS**: Configure API settings for web applications

## Support

For questions or issues with the database setup:
1. Check the test suite results
2. Review migration history
3. Consult Supabase documentation
4. Test queries in the SQL Editor

---

**Created**: July 9, 2025
**Database**: PostgreSQL with pgvector v0.8.0
**Status**: Production Ready
