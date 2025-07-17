# Knowledge Base Management API Documentation

This document outlines the RESTful API endpoints for the Knowledge Base Management system in the Enterprise Chatbot Platform.

## Access Control

All endpoints enforce role-based access control and are only accessible to users with the following roles:
- Super Admin
- Knowledge Manager

## Endpoints

### Knowledge Base Management

#### List Knowledge Bases
- **Endpoint**: `GET /api/knowledge-base/list`
- **Description**: Retrieves all knowledge bases with document counts
- **Response**: Array of knowledge bases with their associated document counts
- **Authorization**: Super Admin, Knowledge Manager

#### Delete Knowledge Base
- **Endpoint**: `DELETE /api/knowledge-base/[id]`
- **Description**: Deletes a knowledge base, its documents, and associated storage files
- **URL Parameters**: `id` (UUID of knowledge base)
- **Behavior**:
  - Removes all associated storage objects in the `chatbot-documents` bucket
  - Deletes the knowledge base record which cascades to delete associated documents and document chunks
- **Authorization**: Super Admin, Knowledge Manager

### Document Management

#### Upload File to Knowledge Base
- **Endpoint**: `POST /api/knowledge-base/upload-file`
- **Description**: Uploads a file to a knowledge base and triggers n8n processing
- **Request Body** (multipart/form-data):
  - `file`: File object (max 20MB)
  - `knowledgeBaseName`: String (required if creating a new KB)
  - `knowledgeBaseId`: UUID (required if using existing KB)
- **Supported File Types**:
  - PDF (application/pdf)
  - DOCX (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
  - XLSX (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
  - CSV (text/csv)
- **Behavior**:
  1. Uploads file to Supabase Storage in `chatbot-documents/<kb_name>/<filename>`
  2. Creates document record in the database
  3. Triggers n8n webhook (`/webhook/upload-doc`) with file metadata
- **Authorization**: Super Admin, Knowledge Manager

#### Upload URL to Knowledge Base
- **Endpoint**: `POST /api/knowledge-base/upload-url`
- **Description**: Adds a URL or sitemap to a knowledge base for content extraction and processing
- **Request Body** (JSON):
  ```json
  {
    "url": "https://example.com",
    "knowledgeBaseName": "Example KB",
    "knowledgeBaseId": "uuid-of-existing-kb",
    "isSitemap": false
  }
  ```
- **Behavior**:
  1. Validates URL format
  2. For sitemaps, performs basic validation
  3. Creates document record in database (with no storage file)
  4. Triggers n8n webhook (`/webhook/upload-url`) with URL metadata
- **Authorization**: Super Admin, Knowledge Manager

#### Delete Document
- **Endpoint**: `DELETE /api/knowledge-base/document/[id]`
- **Description**: Deletes a document and its associated file (if applicable)
- **URL Parameters**: `id` (UUID of document)
- **Behavior**:
  - For file-based documents: Removes the storage object from `chatbot-documents` bucket
  - Deletes the document record which cascades to delete associated document chunks
- **Authorization**: Super Admin, Knowledge Manager

## Error Handling

All endpoints follow a consistent error handling pattern:
- 400: Bad Request (invalid input)
- 401: Unauthorized (user not authenticated)
- 403: Forbidden (user doesn't have required role)
- 404: Not Found (resource doesn't exist)
- 500: Internal Server Error (unexpected error)

## Integration with n8n

After successful uploads, the API endpoints trigger n8n webhooks to process the files/URLs:
- For files: `POST /webhook/upload-doc` with payload `{path, file_name, knowledge_base_id}`
- For URLs: `POST /webhook/upload-url` with payload `{path: "", file_name: url, knowledge_base_id, is_sitemap}`

The n8n workflows handle:
- Content extraction
- Text chunking
- Embedding generation
- Vector storage
- Status updates
