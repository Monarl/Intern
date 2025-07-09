---
applyTo: '**'
---

# Global Instructions for Enterprise Chatbot System

### 🔄 Project Awareness & Context
- **Always read `PLANNING.md`** at the start of a new conversation to understand the project's architecture, n8n-first approach, and technology stack.
- **Always read `Chatbot/Chatbot_DoanhNghiep.md`** for specific module details and requirements.
- **Check `TASKS.md`** before starting a new task. If the task isn't listed, add it with a brief description and today's date.
- **Follow the n8n-first philosophy**: Prioritize n8n workflows over custom code. Only write custom code when n8n cannot handle the requirement.
- **Use consistent naming conventions and file structure** as described in `PLANNING.md`.

### 🏗️ Architecture & Technology Stack
- **Primary Stack**: Supabase (PostgreSQL + pgvector) + n8n + Next.js 14 + TypeScript
- **Frontend**: React + Tailwind CSS + shadcn/ui components
- **State Management**: Zustand or React Context (avoid Redux complexity)
- **Authentication**: Supabase Auth only
- **Database**: Supabase PostgreSQL with pgvector extension for vector embeddings
- **AI/LLM**: Gemini 1.5 Pro + Embedding-001 API
- **Real-time**: Supabase Realtime subscriptions

### 📁 Project Structure
Follow this exact folder structure:
```
chatbot-enterprise/
├── admin-dashboard/          # Next.js admin interface
├── chat-widget/             # Embeddable chat widget
├── n8n-workflows/           # Exported n8n workflow files (.json)
├── docs/                    # Documentation
├── tests/                   # Test files
└── .env.example            # Environment variables template
```

**Note**: Database schema and RLS policies are managed through Supabase web interface. n8n runs locally via npm.

### 🔧 Development Guidelines

#### n8n Workflow Rules:
- **Always prefer n8n workflows** for business logic, data processing, and integrations
- **Local development**: Use `npm install n8n -g` then `n8n start` for local development
- **Access**: n8n web interface at http://localhost:5678
- **Document workflows**: Export n8n workflows as JSON files to `n8n-workflows/` folder
- **Naming convention**: Use descriptive names like `document-processing-workflow.json`
- **Error handling**: Always add error handling nodes in n8n workflows
- **Webhooks**: Use consistent webhook naming patterns: `/webhook/[workflow-name]`
- **Environment**: Configure Gemini and Supabase credentials in n8n settings

#### Next.js/React Rules:
- **Use App Router** (Next.js 14) - no Pages Router
- **TypeScript only** - no JavaScript files
- **Component structure**: Use functional components with hooks
- **File naming**: Use kebab-case for files, PascalCase for components
- **Supabase client**: Use `@supabase/auth-helpers-nextjs` for auth
- **Forms**: Use react-hook-form with zod validation

#### Database Rules:
- **Always use Supabase RLS** (Row Level Security) for data access control via Authentication → Policies in Dashboard
- **UUID primary keys** for all tables
- **Timestamps**: Use `TIMESTAMP WITH TIME ZONE` with `DEFAULT NOW()`
- **Vector embeddings**: Use dimension 768 for Gemini embeddings
- **Indexes**: Create appropriate indexes for vector similarity search via SQL Editor
- **Schema management**: Use Supabase SQL Editor in Dashboard for all database operations
- **Storage**: Create buckets through Storage → Buckets in Dashboard

### 🧱 Code Structure & Modularity
- **Never create a file longer than 300 lines** (smaller than typical due to n8n handling business logic)
- **Organize by feature**, not by file type:
  ```
  admin-dashboard/
  ├── app/
  │   ├── (auth)/
  │   ├── dashboard/
  │   ├── knowledge-base/
  │   └── chatbots/
  ├── components/
  │   ├── ui/              # shadcn/ui components
  │   ├── knowledge-base/  # Feature-specific components
  │   └── chatbots/
  ├── lib/
  │   ├── supabase.ts
  │   ├── n8n.ts
  │   └── utils.ts
  └── types/
      └── database.ts
  ```

### 🔐 Security & Authentication
- **Role-based access control**: Use Supabase Auth with custom roles
- **API keys**: Store in environment variables, never in code
- **RLS policies**: Every table must have appropriate RLS policies configured via Dashboard → Authentication → Policies
- **Webhook security**: Always validate webhook signatures from n8n
- **CORS**: Configure properly in Supabase Dashboard → API Settings
- **Database access**: All schema changes through Supabase SQL Editor in Dashboard

### 🧪 Testing & Reliability
- **Test n8n workflows** manually before deployment
- **Unit tests for React components** using Jest and React Testing Library
- **API endpoint tests** for custom Next.js API routes
- **Database tests** for RLS policies and functions
- **Integration tests** for complete user flows

#### Test Structure:
```
tests/
├── components/          # React component tests
├── api/                # API endpoint tests
├── workflows/          # n8n workflow test cases
└── integration/        # End-to-end integration tests
```

### 📊 Database Schema Standards
Follow the exact schema from `PLANNING.md`:
- **Users**: `users`, `user_roles` tables
- **Knowledge Base**: `knowledge_bases`, `documents`, `document_chunks`
- **Chatbots**: `chatbots`, `chat_sessions`, `chat_messages`
- **Social Media**: `facebook_pages`, `comment_monitoring`

#### Required fields for all tables:
- `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`
- `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- `metadata JSONB DEFAULT '{}'` (for flexibility)

### 🤖 AI/LLM Integration
- **Gemini API only** - use gemini-1.5-pro for chat, embedding-001 for embeddings
- **Context management**: Maintain conversation context in `chat_sessions`
- **RAG implementation**: Use pgvector for similarity search
- **Prompt engineering**: Store prompts in database for easy modification
- **Rate limiting**: Implement Gemini API rate limiting

### 🔄 n8n Workflow Patterns

#### Standard Workflow Structure:
1. **Trigger Node** (Webhook/Schedule/Manual)
2. **Input Validation** (IF/Switch nodes)
3. **Processing Logic** (Function/HTTP/Database nodes)
4. **Error Handling** (Error Trigger + Notification)
5. **Output/Response** (Webhook Response/Database Update)

#### Required Workflows:
- `document-processing-workflow.json`: File upload → embedding → storage
- `web-scraping-workflow.json`: URL → content extraction → embedding
- `rag-query-workflow.json`: Query → vector search → LLM response
- `facebook-integration-workflow.json`: Facebook webhook → processing → response
- `human-handoff-workflow.json`: Escalation → notification → transfer

### 🎨 UI/UX Standards
- **shadcn/ui components only** - no custom UI libraries
- **Tailwind CSS** for styling - no custom CSS files
- **Responsive design** - mobile-first approach
- **Dark/Light mode** support using next-themes
- **Loading states** for all async operations
- **Error boundaries** for React components

### 🔄 Development Workflow
1. **Plan in n8n first** - can this be done as a workflow?
2. **Update TASKS.md** with new task
3. **Create/update n8n workflow** if needed
4. **Write minimal Next.js code** for UI only
5. **Test integration** between n8n and Next.js
6. **Update documentation**
7. **Mark task complete** in TASKS.md

### 🚀 Deployment & Environment
- **Environment variables**: Use `.env.local` for local development
- **Required env vars**:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  GEMINI_API_KEY=
  N8N_WEBHOOK_URL=http://localhost:5678/webhook/
  ```
- **n8n local**: Use `npm install n8n -g` then `n8n start` for development
- **Vercel**: Deploy Next.js apps to Vercel
- **Supabase**: Use Supabase hosting for database and manage via Dashboard

### 🐛 Error Handling & Monitoring
- **n8n workflows**: Always include error trigger nodes
- **Next.js**: Use try-catch blocks and error boundaries
- **Supabase**: Handle database errors gracefully
- **Gemini**: Implement retry logic for API failures
- **Logging**: Use console.log for development, proper logging for production

### 📚 Documentation Standards
- **Every n8n workflow** must have a README.md in `n8n-workflows/`
- **API documentation** for custom endpoints
- **Component documentation** using JSDoc
- **Database schema documentation** for tables and RLS policies
- **Supabase setup guides** for Dashboard configuration
- **Deployment guides** for each environment

### 🔍 Code Quality Rules
- **TypeScript strict mode** enabled
- **ESLint** configuration from Next.js
- **Prettier** for code formatting
- **Husky** for pre-commit hooks
- **No console.log** in production builds
- **Meaningful variable names** - no abbreviations

### 🌐 Multi-platform Integration
- **Facebook Messenger**: Use Graph API via n8n
- **WhatsApp Business**: Use Business API via n8n
- **Instagram**: Use Graph API via n8n
- **Zalo**: Use Zalo API via n8n
- **Website embed**: Use Next.js chat widget

### 📈 Performance Guidelines
- **Vector search**: Use appropriate similarity thresholds
- **Caching**: Implement Redis caching for frequent queries
- **Image optimization**: Use Next.js Image component
- **Bundle optimization**: Use dynamic imports for large components
- **Database queries**: Use Supabase query optimization

### 🧠 AI Behavior Rules
- **Never assume missing context** - always ask for clarification
- **Prefer n8n workflows** over custom code
- **Use exact file paths** from project structure
- **Follow TypeScript patterns** strictly
- **Test integrations** between n8n and Next.js
- **Validate all user inputs** at both frontend and n8n levels
- **Never hardcode API keys** or sensitive data

### ✅ Definition of Done
Before marking any task complete:
- [ ] n8n workflow created/updated and tested via web interface
- [ ] Next.js components implemented with TypeScript
- [ ] Database schema updated with RLS policies via Supabase Dashboard
- [ ] Integration between n8n and Next.js working
- [ ] Error handling implemented
- [ ] Documentation updated
- [ ] Task marked complete in TASKS.md

This global instruction file ensures consistent development practices while maintaining the n8n-first philosophy and modern web development standards for the Enterprise Chatbot System.
