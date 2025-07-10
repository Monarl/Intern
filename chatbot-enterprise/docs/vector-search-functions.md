# Vector Search Functions Documentation

## Overview
This document describes the vector search functions created for the Enterprise Chatbot System to retrieve relevant document chunks for RAG (Retrieval Augmented Generation) functionality.

## Functions

### 1. `match_document_chunks`
**Purpose**: Performs vector similarity search to find the most relevant document chunks.

**Signature**:
```sql
match_document_chunks(
  query_embedding vector(768),
  knowledge_base_ids uuid[] DEFAULT NULL,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
```

**Parameters**:
- `query_embedding`: The 768-dimensional vector representation of the user's query
- `knowledge_base_ids`: Array of knowledge base IDs to search within (NULL for all)
- `match_threshold`: Minimum similarity score (0.0 to 1.0)
- `match_count`: Maximum number of chunks to return

**Returns**:
- `id`: Chunk UUID
- `document_id`: Parent document UUID
- `content`: Text content of the chunk
- `chunk_index`: Position within the document
- `metadata`: Additional chunk metadata
- `similarity`: Cosine similarity score (0.0 to 1.0)

**Usage Example**:
```sql
SELECT * FROM match_document_chunks(
  '[0.1, 0.2, 0.3, ...]'::vector,  -- Query embedding
  ARRAY['kb-uuid-1', 'kb-uuid-2'],  -- Specific knowledge bases
  0.7,                               -- High similarity threshold
  5                                  -- Top 5 matches
);
```

### 2. `hybrid_search_chunks`
**Purpose**: Combines vector similarity with text-based search for improved relevance.

**Signature**:
```sql
hybrid_search_chunks(
  query_embedding vector(768),
  query_text text DEFAULT NULL,
  knowledge_base_ids uuid[] DEFAULT NULL,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
```

**Parameters**:
- `query_embedding`: Vector representation of the query
- `query_text`: Text query for keyword matching
- `knowledge_base_ids`: Array of knowledge base IDs to search within
- `match_threshold`: Minimum similarity score
- `match_count`: Maximum number of chunks to return

**Returns**:
- All fields from `match_document_chunks` plus:
- `text_rank`: PostgreSQL full-text search ranking score

**Scoring Formula**:
```
final_score = (vector_similarity * 0.7) + (text_rank * 0.3)
```

**Usage Example**:
```sql
SELECT * FROM hybrid_search_chunks(
  '[0.1, 0.2, 0.3, ...]'::vector,
  'artificial intelligence chatbot',
  NULL,
  0.6,
  10
);
```

### 3. `get_chunk_context`
**Purpose**: Retrieves surrounding chunks for better context understanding.

**Signature**:
```sql
get_chunk_context(
  chunk_id uuid,
  context_size int DEFAULT 2
)
```

**Parameters**:
- `chunk_id`: UUID of the target chunk
- `context_size`: Number of chunks before and after to include

**Returns**:
- `id`: Chunk UUID
- `content`: Text content
- `chunk_index`: Position within document
- `is_target`: Boolean indicating if this is the original chunk

**Usage Example**:
```sql
SELECT * FROM get_chunk_context(
  'chunk-uuid-here',
  3  -- 3 chunks before and after
);
```

## Vector Search Best Practices

### 1. Similarity Thresholds
- **0.8-1.0**: Very high similarity (exact matches)
- **0.6-0.8**: High similarity (good matches)
- **0.4-0.6**: Moderate similarity (potentially relevant)
- **0.0-0.4**: Low similarity (likely irrelevant)

### 2. Chunk Count Recommendations
- **Chat responses**: 3-5 chunks
- **Document summarization**: 10-20 chunks
- **Comprehensive search**: 20-50 chunks

### 3. Knowledge Base Filtering
Always filter by knowledge base to ensure users only access authorized content:
```sql
-- Good: Filtered search
SELECT * FROM match_document_chunks(
  query_embedding,
  ARRAY['user-accessible-kb-1', 'user-accessible-kb-2'],
  0.6,
  5
);

-- Avoid: Unfiltered search (security risk)
SELECT * FROM match_document_chunks(
  query_embedding,
  NULL,  -- Searches all knowledge bases
  0.6,
  5
);
```

## Integration with n8n Workflows

### Document Processing Workflow
When n8n processes documents, it should:
1. Extract text content
2. Split into chunks (500-1000 characters)
3. Generate embeddings using Gemini API
4. Store in `document_chunks` table

### RAG Query Workflow
When processing user queries:
1. Generate query embedding using Gemini API
2. Call `match_document_chunks` or `hybrid_search_chunks`
3. Use retrieved chunks as context for LLM response
4. Optionally call `get_chunk_context` for better understanding

## Performance Considerations

### Indexing
The IVFFlat index is optimized for:
- **Lists**: 1000-10000 (default: 1000)
- **Probes**: 1-Lists/10 (default: 1)

### Query Optimization
```sql
-- Efficient: Uses index
SELECT * FROM match_document_chunks(query_embedding, kb_ids, 0.5, 5);

-- Less efficient: Large result set
SELECT * FROM match_document_chunks(query_embedding, NULL, 0.1, 100);
```

### Batch Processing
For bulk operations, consider:
- Processing embeddings in batches of 100-500
- Using prepared statements for repeated queries
- Monitoring index usage and performance

## Security Considerations

### Row Level Security
All functions respect RLS policies:
- Users can only access chunks from authorized knowledge bases
- Role-based access control applies to all search results

### Search Path Security
Functions use `SECURITY DEFINER` with immutable search paths to prevent injection attacks.

## Testing

### Unit Tests
```sql
-- Test basic vector search
SELECT COUNT(*) FROM match_document_chunks(
  array_fill(0.5, ARRAY[768])::vector,
  NULL,
  0.0,
  10
);

-- Test hybrid search
SELECT COUNT(*) FROM hybrid_search_chunks(
  array_fill(0.5, ARRAY[768])::vector,
  'test query',
  NULL,
  0.0,
  10
);
```

### Performance Tests
```sql
-- Test query performance
EXPLAIN ANALYZE SELECT * FROM match_document_chunks(
  array_fill(0.5, ARRAY[768])::vector,
  NULL,
  0.5,
  5
);
```

## Troubleshooting

### Common Issues

1. **No results returned**: Check similarity threshold (try 0.0)
2. **Slow queries**: Verify index usage with EXPLAIN ANALYZE
3. **Permission errors**: Check RLS policies and user roles
4. **Memory issues**: Reduce match_count or increase available memory

### Monitoring
```sql
-- Monitor function usage
SELECT * FROM pg_stat_user_functions 
WHERE funcname LIKE '%match%' OR funcname LIKE '%hybrid%';

-- Check index usage
SELECT * FROM pg_stat_user_indexes 
WHERE indexrelname LIKE '%embedding%';
```

---

**Last Updated**: July 9, 2025
**Version**: 1.0
**Dependencies**: pgvector v0.8.0, PostgreSQL 15+
