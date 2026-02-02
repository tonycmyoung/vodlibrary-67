# Project Rules for AI Assistants

This file contains instructions and context for AI assistants (v0, Claude, etc.) working on this codebase.

**Read this file at the start of every conversation.**

---

## Project Overview

This is a Next.js 15 application with Supabase integration for a video library system (TY Kobudo Library). It uses TypeScript, Tailwind CSS, and shadcn/ui components.

---

## Critical Patterns - ALWAYS Follow

### 1. Supabase Server Client

**ALWAYS** use the shared helper for server-side Supabase clients:

```typescript
// CORRECT - Use the helper
import { createServerClient } from '@/lib/supabase/server'

export async function myServerAction() {
  const supabase = await createServerClient()
  // ...
}
```

```typescript
// WRONG - Never inline the client creation
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabase = createSupabaseServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { /* ... */ } }
)
```

**Why:** Consistency, maintainability, and the helper already handles cookie management correctly.

### 2. Context Gathering Before Editing

Before making changes, ALWAYS:
1. Search for existing patterns in the codebase
2. Check if helpers/utilities already exist for what you need
3. Read related files to understand the full context
4. Don't stop at the first match - examine ALL relevant files

### 3. Parallel Tool Calls

When multiple searches/reads are independent, execute them in parallel to save time. Only sequence calls when results depend on each other.

---

## Architecture Decisions

### File Structure
- `/app` - Next.js App Router pages and API routes
- `/components` - React components (UI components in `/components/ui`)
- `/lib/actions` - Server actions organized by domain (users, videos, auth, etc.)
- `/lib/supabase` - Supabase client utilities (server.ts, client.ts, middleware.ts)
- `/lib/utils` - Utility functions
- `/tests` - Vitest tests mirroring the source structure

### Authentication
- Uses Supabase Auth with cookie-based session management
- Role-based access: admin, head_teacher, teacher, student
- RLS (Row Level Security) policies in Supabase handle data access

### State Management
- Server Components for initial data fetching
- SWR for client-side data fetching and caching
- No localStorage for data persistence - always use Supabase

---

## Common Mistakes to Avoid

### 1. Duplicating Existing Patterns
Before creating new utilities or patterns, search the codebase. Common helpers exist in:
- `/lib/supabase/server.ts` - Server-side Supabase client
- `/lib/supabase/client.ts` - Client-side Supabase client
- `/lib/utils.ts` - General utilities (cn function, etc.)
- `/lib/utils/date.ts` - Date formatting
- `/lib/utils/auth.ts` - Auth utilities

### 2. Incomplete Context Gathering
Don't assume based on one file. Related functionality often spans:
- The component file
- Its parent/wrapper components
- Associated server actions in `/lib/actions`
- Type definitions
- Test files

### 3. Breaking Existing Tests
After changes, consider if existing tests need updates. Test files mirror source structure in `/tests`.

### 4. Inconsistent Environment Variables
- `NEXT_PUBLIC_*` - Available on client and server
- Non-prefixed - Server only
- Both `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` exist - prefer `NEXT_PUBLIC_` versions for consistency

---

## Code Style

### TypeScript
- Strict mode enabled
- Prefer explicit types over `any`
- Use type imports: `import type { X } from 'y'`

### React/Next.js
- Prefer Server Components where possible
- Use `'use client'` directive only when needed
- Split large components into smaller, focused ones

### Tailwind CSS
- Use design tokens (bg-background, text-foreground) over direct colors
- Prefer flexbox for layouts: `flex items-center justify-between`
- Use gap classes for spacing: `gap-4`, not margins between children

### Imports
- Use path aliases: `@/lib/...`, `@/components/...`
- Group imports: external, then internal, then relative

---

## Testing

- Framework: Vitest with React Testing Library
- Mocks: Located in `/tests/mocks`
- Run tests before confirming changes work

---

## Debugging

When debugging, use labeled console logs:
```typescript
console.log("[v0] Description:", variable)
```

Remove debug statements once the issue is resolved.

---

## When Uncertain

1. Search the codebase for similar implementations
2. Check the docs in `/docs` folder
3. Ask clarifying questions rather than assuming
4. Prefer minimal, targeted changes over broad refactoring

---

## Recent Learnings (Update as needed)

- 2025-02: Consolidated inline Supabase client creation in `/lib/actions/users.tsx` to use shared `createServerClient()` helper
- Server actions should always use `await createServerClient()` from `/lib/supabase/server.ts`
