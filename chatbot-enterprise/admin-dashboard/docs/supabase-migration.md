# Supabase Authentication Migration Guide

This document outlines the migration from the original Supabase authentication implementation in `/lib/supabase` to the new App Router compatible implementation in `/app/lib/supabase`.

## Migration Background

Next.js App Router requires server components to be within the `/app` directory. Our previous implementation used server-side functions outside this directory, causing compatibility issues with features like `next/headers`.

## Directory Structure Changes

**Old Structure:**
```
/lib/supabase/
  ├── server.ts
  ├── client.ts
  ├── user-roles.ts
  └── ...
```

**New Structure:**
```
/app/lib/supabase/
  ├── server.ts
  ├── client.ts
  ├── index.ts (exports for easier imports)
  └── middleware.ts
```

## Migration Steps for Developers

1. **Update imports** from old paths to new paths:

   ```typescript
   // OLD
   import { createClient } from '@/lib/supabase/server'
   
   // NEW
   import { createClient } from '@/app/lib/supabase/server'
   ```

2. **For client components**, use the client-specific import:

   ```typescript
   // For client components only
   import { createClient } from '@/app/lib/supabase/client'
   ```

3. **For server components**, use the default import:

   ```typescript
   // For server components only (inside app directory)
   import { createClient } from '@/app/lib/supabase/server'
   ```

## Compatibility Notes

- The old paths (`@/lib/supabase/server` and `@/lib/supabase/client`) will continue to work through compatibility layers
- However, all new code should use the new paths
- The compatibility layers will be removed in a future update

## Technical Implementation Details

- Server components now properly await the cookies() API
- Middleware uses the correct pattern for authentication
- Client components use the browser-specific client with 'use client' directive
- The index.ts file in app/lib/supabase re-exports the server client
- Server file has 'use server' directive

## Import Example For Client Components

For React Client Components (those marked with 'use client'), use:

```typescript
'use client'

import { createClient } from '@/app/lib/supabase/client'

// ...
const supabase = createClient()
// ...
```
