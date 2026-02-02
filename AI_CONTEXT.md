# AI Context for TY Kobudo Library

This file provides context and rules for AI assistants (v0, Claude, etc.) working on this codebase.

**AI agents should read this file at the start of every conversation.**

---

## Project Overview

- **Framework:** Next.js 15 with App Router
- **Database:** Supabase (PostgreSQL with RLS)
- **Auth:** Supabase Auth with cookie-based sessions
- **Styling:** Tailwind CSS + shadcn/ui components
- **Testing:** Vitest + React Testing Library
- **Language:** TypeScript (strict mode)

---

## Core Principles

### 1. Always Reuse Existing Patterns

Before creating anything new, search the codebase. If similar functionality exists, use it.

**Key shared utilities:**
| Purpose | Location |
|---------|----------|
| Server Supabase client | `@/lib/supabase/server` → `createServerClient()` |
| Client Supabase client | `@/lib/supabase/client` → `createBrowserClient()` |
| Trace logging | `@/lib/trace-logger` → `TraceLogger` |
| Date formatting | `@/lib/utils/date` |
| Auth utilities | `@/lib/utils/auth` |
| General utilities | `@/lib/utils` → `cn()` |

### 2. Gather Full Context Before Changes

- Search for ALL related files, not just the first match
- Check parent components, server actions, and types
- Understand how changes fit into the broader architecture
- Use parallel tool calls when searches are independent

### 3. Minimal, Targeted Changes

- Only edit files that need to change
- Don't introduce enhancements unless explicitly requested
- Maintain backward compatibility
- Don't delete/rename files without explicit authorization

### 4. Never Duplicate Files or Logic

Before creating a new file:
1. Search for existing files with similar functionality
2. Check if extending an existing file makes more sense
3. Confirm with user if uncertain

---

## Architecture

```
/app                    # Next.js App Router pages & API routes
/components             # React components
  /ui                   # shadcn/ui base components
/lib
  /actions              # Server actions by domain (users, videos, auth, etc.)
  /supabase             # Supabase client utilities
  /utils                # Utility functions
/tests                  # Vitest tests (mirrors source structure)
/docs                   # Project documentation
/scripts                # Database migration scripts
```

### Authentication & Authorization

- **Roles:** admin, head_teacher, teacher, student
- **Session:** Cookie-based via Supabase Auth
- **Data access:** Enforced by Supabase RLS policies
- **No localStorage:** Always use Supabase for data persistence

---

## Code Patterns

### Server Actions

```typescript
// CORRECT - Always use the shared helper
import { createServerClient } from '@/lib/supabase/server'

export async function myServerAction() {
  const supabase = await createServerClient()
  // ...
}
```

### Debugging with Trace Logger

```typescript
// PREFERRED - Use trace logger for persistent, viewable logs
import { TraceLogger } from '@/lib/trace-logger'

const trace = new TraceLogger('ComponentName')
trace.log('Operation description', { relevantData })
```

```typescript
// ACCEPTABLE - For quick temporary debugging only
console.log("[v0] Description:", variable)
// Remove these after debugging is complete
```

### Component Structure

- Prefer Server Components; use `'use client'` only when needed
- Split large components into smaller, focused files
- Use SWR for client-side data fetching

### Styling

- Use design tokens: `bg-background`, `text-foreground`
- Flexbox for layouts: `flex items-center justify-between`
- Gap for spacing: `gap-4` (not margins between children)

---

## Testing

- **Location:** `/tests` mirrors source structure
- **Mocks:** `/tests/mocks` (Supabase, Next.js navigation, etc.)
- **After changes:** Consider if tests need updates

---

## Common Mistakes to Avoid

| Mistake | Instead |
|---------|---------|
| Creating inline Supabase clients | Use `createServerClient()` from shared helper |
| Stopping at first search match | Examine ALL related files |
| Assuming without reading context | Read related files first |
| Using localStorage | Use Supabase for persistence |
| Creating duplicate utilities | Search for existing ones first |
| Large monolithic changes | Make minimal, targeted edits |

---

## Connected Integrations

| Integration | Purpose | Notes |
|-------------|---------|-------|
| Supabase | Database, Auth, Storage | Use `GetOrRequestIntegration` for schema |
| Blob | File storage | Vercel Blob storage |

**Supabase MCP Tools:** 29 tools available via `ToolSearch` including `supabase_search_docs`, `supabase_list_tables`, `supabase_run_query`, etc.

---

## Environment Variables

- `NEXT_PUBLIC_*` — Available client + server
- Non-prefixed — Server only
- Prefer `NEXT_PUBLIC_SUPABASE_URL` over `SUPABASE_URL` for consistency

---

## When Uncertain

1. Search the codebase for similar implementations
2. Check `/docs` folder for documentation
3. Ask clarifying questions rather than assuming
4. Propose approach before making large changes

---

## Maintaining This File

**Do not auto-update.** Only update when the user explicitly requests it (e.g., "add this to AI_CONTEXT.md" or "document this learning").

This keeps the file curated and high-signal, avoiding bloat from one-off issues.

---

## Recent Learnings

*Update this section when user identifies recurring patterns or significant mistakes:*

- **2025-02:** Server actions must use `await createServerClient()` from `/lib/supabase/server.ts`, never inline client creation
- **2025-02:** TraceLogger exists for debugging — prefer it over console.log for traceability

---

## v0 Instruction

Add this single instruction to v0:

> **Always read `/AI_CONTEXT.md` at the start of each conversation before making any changes.**
