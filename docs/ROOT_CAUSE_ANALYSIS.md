# Root Cause Analysis: GitHub Actions vs Vercel Build Differences

## Problem
GitHub Actions workflow was failing on `npm install` with peer dependency errors, while Vercel deployments worked fine.

## Root Cause
**Vercel uses `--legacy-peer-deps` by default, GitHub Actions uses strict `npm install`**

### Why This Matters
- React 19 is new (released with Next.js 15)
- Many packages like `vaul` still declare peer dependencies as `^16.8 || ^17.0 || ^18.0`
- These packages work fine with React 19, but strict npm install refuses to install them
- Vercel's build system automatically uses `--legacy-peer-deps` to handle this

## Solution
Updated `.github/workflows/sonarqube.yml` to use:
```bash
npm install --legacy-peer-deps
```

This matches Vercel's behavior and allows the workflow to install dependencies successfully.

## What We Avoided Breaking
- **vaul**: Restored to package.json (shadcn/ui drawer component)
- All other dependencies remain unchanged
- Vercel deployment process unaffected
- Production builds continue working as before

## Key Takeaway
When creating CI/CD workflows for Next.js 15 + React 19 projects, always use `--legacy-peer-deps` until the ecosystem catches up with peer dependency declarations.
