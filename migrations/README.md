# Database Migrations

This folder contains ordered, idempotent database migration scripts for setting up the application schema from scratch.

## Usage

Migrations are meant to be applied in numerical order:

```bash
psql -d your_database < 0001-initial_schema.sql
psql -d your_database < 0002-add_performers.sql
psql -d your_database < 0003-add_notifications.sql
# ... and so on
```

Or run all migrations in sequence:

```bash
for file in *.sql; do psql -d your_database < "$file"; done
```

## Migration Files

- **0001-initial_schema.sql** - Core tables: users, videos, categories, user_favorites, video_categories
- **0002-add_performers.sql** - Performers and video_performers junction table
- **0003-add_notifications.sql** - Notifications system with RLS policies
- **0004-add_audit_logs.sql** - Audit logging table
- **0005-add_trace_tables.sql** - Trace logging for diagnostics
- **0006-add_curriculums.sql** - Curriculum management tables
- **0007-add_user_tracking.sql** - User login and video view tracking
- **0008-add_invitations_and_consents.sql** - User invitations and consent tracking
- **0009-enable_rls_core_tables.sql** - Row-level security policies for all tables
- **0010-add_head_teacher_role.sql** - Add head_teacher role option

## Notes

- All scripts use `IF NOT EXISTS` where applicable for idempotency
- Row-level security is configured per table
- Indexes are created for performance optimization
- Timestamps are stored in UTC with timezone awareness
