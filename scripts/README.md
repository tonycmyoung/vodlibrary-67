# Scripts Folder - Working & Diagnostic Scripts

This folder contains **working and diagnostic scripts** for development and debugging. These are **NOT** production migrations.

## Purpose

- **Temporary testing and ad-hoc work**: Use the `temp-*.sql` naming convention for temporary scripts
- **Diagnostic scripts**: Troubleshooting utilities prefixed with `diagnose-*.sql` for debugging RLS, JWT, and user access issues
- **Performance analysis**: `analyze-performance.js` for database performance profiling

## Important Notes

⚠️ **Do not use scripts from this folder in production deployments**. For production migrations, use the `/migrations/` folder instead.

## Naming Conventions

- `temp-*.sql` - Temporary scripts that should be deleted after use (also added to `.gitignore`)
- `diagnose-*.sql` - Diagnostic/debugging utilities (can be kept for troubleshooting)
- `analyze-*.{js|sql}` - Performance analysis tools

## Usage Example

```bash
# Temporary work (won't be committed)
psql -d $DATABASE_URL -f scripts/temp-quick-test.sql

# Diagnostic debugging
psql -d $DATABASE_URL -f scripts/diagnose-rls-policies.sql

# Performance analysis
node scripts/analyze-performance.js
```

## Files in This Folder

- `analyze-performance.js` - Database performance profiling tool
- `diagnose-*.sql` - Diagnostic scripts for troubleshooting
- `create-*.sql`, `add-*.sql` - Utility scripts (these have been superseded by the `/migrations/` folder)
