# Curriculum Sets Architecture

## Overview

The Curriculum Sets system organizes belt levels into structured curriculum pathways, allowing multiple independent curricula to coexist within a single video library. This design supports organizations with multiple training methodologies or schools.

## Concepts

### Curriculum Set
A top-level organizational unit that groups related curricula. Examples: "Okinawa Kobudo", "Matayoshi", "Beginner Track".

**Database Table: `curriculum_sets`**
- `id` - UUID (primary key)
- `name` - Unique identifier for the set
- `description` - Human-readable description
- `is_active` - Visibility flag for admin filtering
- `created_by` - Admin who created it
- `created_at`, `updated_at` - Timestamps

### Curriculum (Belt Level)
Individual belt levels or training stages within a curriculum set. Example: "Yellow Belt", "Orange Belt", "Green Belt".

**Database Table: `curriculums`**
- `id` - UUID (primary key)
- `name` - Unique within its curriculum_set (not globally unique)
- `description` - Training stage or level description
- `display_order` - Integer for ordering within the set (1, 2, 3, ...)
- `color` - Display color for UI representation (e.g., belt color)
- `curriculum_set_id` - Foreign key to curriculum_sets
- `created_by` - Creator admin
- `created_at` - Creation timestamp

### User Assignment
Students are assigned a single curriculum set, which determines:
- Which videos they can access (filtered by curriculum set)
- Their available belt levels for progression
- Content organization in their library view

**Implementation:**
- `users.curriculum_set_id` - Foreign key to curriculum_sets (nullable for unassigned users)
- `users.current_belt_id` - Foreign key to curriculums, indicating the student's current training level within their set

## User Access Patterns

### Admin
- View and manage all curriculum sets and curricula
- Create, edit, activate/deactivate curriculum sets
- Create, edit, order curricula within sets
- Assign curriculum sets to users
- Manage video associations with curricula

### Head Teacher
- Assign curriculum sets to students in their school
- View students' assigned curriculum set (read-only)
- Edit student belt levels within their school
- Cannot create or modify curriculum sets themselves

### Teacher
- View students' assigned curriculum set (read-only, cannot edit)
- Edit student belt levels within their school
- Cannot assign curriculum sets or manage infrastructure

### Student
- View only videos from their assigned curriculum set
- Progress through belt levels within their set
- Cannot view or access other curriculum sets

## Database Relationships

```
curriculum_sets (1) ──────── (n) curriculums
                              │
                              └──── (n) videos (via video_curriculums junction table)

curriculum_sets (1) ──────── (n) users (via curriculum_set_id in users table)

users ──────── curriculums (via current_belt_id - user's current training level)
```

**Video Association**: Videos are linked to curricula via the `video_curriculums` junction table, allowing a video to belong to multiple curricula.

## Admin Workflows

### Creating a New Curriculum Set

1. Navigate to Admin → Metadata (Curriculum Sets management)
2. Click "Create New Curriculum Set"
3. Enter:
   - **Name** (unique): E.g., "Okinawa Kobudo"
   - **Description**: E.g., "Traditional Okinawan weapons training"
   - **Active**: Toggle to make visible in selections
4. Save
5. System creates empty curriculum set; no curricula yet

### Adding Curricula to a Set

1. Navigate to Admin → Metadata (Curriculum Sets management)
2. Select the curriculum set
3. Click "Add Curriculum"
4. Enter:
   - **Name**: E.g., "Yellow Belt"
   - **Description**: Training objectives or content scope
   - **Display Order**: Position in progression (1 for first, 2 for second, etc.)
   - **Color**: Belt color for visual representation
5. Save
6. Curriculum now appears in the set

### Organizing Curricula

1. From curriculum set management view
2. Reorder curricula by editing `display_order` values
3. System displays curricula sorted by `display_order` ascending
4. Gaps in ordering are acceptable (1, 2, 5 displays in correct order)

### Assigning Curriculum Set to a Student

1. Navigate to Admin → Users (or Student Management)
2. Find student user record
3. Click edit or open student details
4. Dropdown: Select curriculum set from active sets
5. Save
6. Student now has access only to videos in that curriculum set

## Video Content Organization

### Associating a Video with a Curriculum

1. Navigate to Admin → Videos
2. Edit a video
3. Select "Curriculum" (which curriculum_id)
4. Save
5. Video now appears in library for students assigned to that curriculum's set

### Video Visibility Rules

- Videos are only visible to students whose `curriculum_set_id` matches the video's curriculum's `curriculum_set_id`
- Admin can filter videos by curriculum set for easier management
- Teachers and Head Teachers see curriculum groupings on admin video management page

## Admin Video Management UI

The admin video management page displays curricula grouped by curriculum sets:

```
Okinawa Kobudo:
  ├─ Yellow Belt
  ├─ Orange Belt
  └─ Green Belt

Matayoshi:
  ├─ Level 1
  ├─ Level 2
  └─ Level 3
```

This grouping helps admins:
- Quickly locate and organize videos
- Understand content hierarchy
- Identify gaps in content

## Implementation Details

### Component Changes

- **StudentManagement**: Curriculum set dropdown only editable by Head Teachers; Teachers see read-only display
- **VideoModal**: Curriculum dropdown uses grouped display (set name as header, curricula as options)
- **VideoLibrary**: Filters videos by current user's `curriculum_set_id`
- **AdminVideoManagement**: Groups curricula by set for easier browsing

### Server Actions

- `getCurriculumSets()` - Fetch all active curriculum sets
- `createCurriculumSet()` - Create new set (admin only)
- `updateCurriculumSet()` - Modify set details (admin only)
- `assignCurriculumSetToUser()` - Assign set to student (Head Teacher, Admin)
- `getVideosByCurriculumSet()` - Fetch videos for a specific set

### Filtering Logic

**Student Video Library Filter**:
```typescript
if (user.curriculum_set_id) {
  videos = videos.filter(v => 
    v.curriculum?.curriculum_set_id === user.curriculum_set_id
  )
}
```

**Admin Video Filter**:
```typescript
// Optional filter by curriculum_set_id for management
videos = videos.filter(v => 
  !filterSetId || v.curriculum?.curriculum_set_id === filterSetId
)
```

## Permissions Matrix

| Action | Student | Teacher | Head Teacher | Admin |
|--------|---------|---------|--------------|-------|
| View own curriculum set | ✓ | ✓ | ✓ | ✓ |
| Edit own curriculum set | ✗ | ✗ | ✗ | ✓ |
| View student's curriculum set | ✗ | ✓ | ✓ | ✓ |
| Edit student's curriculum set | ✗ | ✗ | ✓ | ✓ |
| Create curriculum sets | ✗ | ✗ | ✗ | ✓ |
| Manage curriculum sets | ✗ | ✗ | ✗ | ✓ |
| Filter videos by set | ✓ | ✓ | ✓ | ✓ |

## Migration Considerations

### From Single Curriculum to Multiple Sets

If migrating from a system with a single curriculum:

1. Create a default curriculum set (e.g., "Default")
2. Create curricula matching existing belt levels
3. Associate all existing videos with corresponding curricula
4. Backfill `curriculum_set_id` for existing users to the default set
5. Update permissions for existing teachers to Head Teacher if they should assign curricula

### Data Integrity

- Ensure all active videos have associated curricula
- Ensure all curricula have valid `curriculum_set_id` references
- Verify no orphaned curriculums exist (deleted set but curricula remain)

## Future Enhancements

- **Curriculum Prerequisites**: Define which curricula must be completed before accessing others
- **Student Progression Tracking**: Automatically advance belt levels based on watch time/completion
- **Multiple Curriculum Sets per User**: Allow students to access multiple curriculum paths simultaneously
- **Curriculum Versioning**: Maintain history of curriculum changes for audit trail
- **Import/Export**: Bulk import curriculum structures from external sources
