# TY Kobudo Library - Development Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [Component Architecture](#component-architecture)
7. [API & Server Actions](#api--server-actions)
8. [Infrastructure & Deployment](#infrastructure--deployment)
9. [Key Features](#key-features)
10. [Development Setup](#development-setup)
11. [Security Considerations](#security-considerations)
12. [AI-Assisted Development](#ai-assisted-development)

## System Overview

The TY Kobudo Library is a private, invite-only video library system designed for traditional martial arts training content. The system serves Matayoshi/Okinawa Kobudo Australia students with curated video content, user management, and administrative capabilities.

### Core Objectives
- Provide secure access to traditional martial arts training videos
- Implement invite-only user registration with admin approval
- Enable content categorization and performer tagging
- Support real-time notifications and user communication
- Maintain comprehensive admin controls for content and user management

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Side   │    │   Server Side   │    │   External      │
│                 │    │                 │    │   Services      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ Next.js Pages   │◄──►│ Server Actions  │◄──►│ Supabase DB     │
│ React Components│    │ API Routes      │    │ Supabase Auth   │
│ Client State    │    │ Middleware      │    │ Resend Email    │
│ UI Components   │    │ Session Mgmt    │    │ Vercel Blob     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Architecture Layers

1. **Presentation Layer**: Next.js 15 with App Router, React components, Tailwind CSS
2. **Business Logic Layer**: Server Actions, API routes, authentication middleware
3. **Data Layer**: Supabase PostgreSQL database with Row Level Security
4. **External Services**: Resend for emails, Vercel Blob for file storage

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4
- **Component Library**: shadcn/ui
- **Icons**: Lucide React
- **Fonts**: Geist (sans-serif)

### Backend
- **Runtime**: Node.js (Vercel serverless functions)
- **Database**: PostgreSQL (Supabase) with Row Level Security
- **Authentication**: Supabase Auth
- **Email Service**: Resend
- **File Storage**: Vercel Blob

### Development & Quality Tools
- **Language**: TypeScript
- **Testing**: Vitest, React Testing Library
- **Code Quality**: ESLint, Prettier, SonarCloud
- **CI/CD**: GitHub Actions
- **Package Manager**: npm
- **Deployment**: Vercel
- **Version Control**: Git

## Database Schema

### Core Tables

#### users
```sql
- id: uuid (primary key)
- email: text (unique)
- full_name: text
- profile_image_url: text
- school: text
- teacher: text
- role: text (Student/Teacher/Head Teacher/Admin)
- curriculum_set_id: uuid (foreign key to curriculum_sets.id, nullable)
- current_belt_id: uuid (foreign key to curriculums.id, nullable)
- is_approved: boolean
- approved_by: uuid (foreign key to users.id)
- approved_at: timestamp
- invited_by: uuid (foreign key to users.id, nullable)
- created_at: timestamp
- updated_at: timestamp
```

#### videos
```sql
- id: uuid (primary key)
- title: text
- description: text
- video_url: text
- thumbnail_url: text
- duration_seconds: integer
- recorded: text
- is_published: boolean
- views: integer
- last_viewed: timestamp with time zone
- created_by: uuid (foreign key to users.id)
- created_at: timestamp
- updated_at: timestamp
```

#### categories
```sql
- id: uuid (primary key)
- name: text
- description: text
- color: text
- created_by: uuid (foreign key to users.id)
- created_at: timestamp
```

#### performers
```sql
- id: uuid (primary key)
- name: character varying
- created_at: timestamp
```

#### curriculums
```sql
- id: uuid (primary key)
- name: text (unique within curriculum_set)
- description: text
- display_order: integer (display order within set)
- color: text (display color for UI)
- curriculum_set_id: uuid (foreign key to curriculum_sets.id)
- created_by: uuid (foreign key to users.id)
- created_at: timestamp
```

#### curriculum_sets
```sql
- id: uuid (primary key)
- name: text (unique)
- description: text
- is_active: boolean
- created_by: uuid (foreign key to users.id)
- created_at: timestamp
- updated_at: timestamp
```

#### notifications
```sql
- id: uuid (primary key)
- sender_id: uuid (foreign key to users.id)
- recipient_id: uuid (foreign key to users.id)
- message: text
- is_read: boolean
- is_broadcast: boolean
- created_at: timestamp
- updated_at: timestamp
```

### Logging & Audit Tables

#### audit_logs
```sql
- id: uuid (primary key)
- actor_id: uuid (foreign key to users.id)
- actor_email: text
- action: text (action performed)
- target_id: uuid (affected entity)
- target_email: text (for user-related actions)
- additional_data: jsonb (extra context)
- created_at: timestamp with time zone
```

#### auth_debug_logs
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to users.id)
- user_email: text
- event_type: text
- success: boolean
- error_message: text
- error_code: text
- ip_address: text
- user_agent: text
- additional_data: jsonb
- created_at: timestamp with time zone
```

#### invitations
```sql
- id: uuid (primary key)
- email: text
- token: text
- status: text
- invited_by: uuid (foreign key to users.id)
- invited_at: timestamp with time zone
- expires_at: timestamp with time zone
- created_at: timestamp with time zone
```

#### user_consents
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to users.id)
- eula_accepted_at: timestamp
- privacy_accepted_at: timestamp
- created_at: timestamp
- updated_at: timestamp
```

#### user_logins
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to users.id)
- login_time: timestamp with time zone
- ip_address: text
- user_agent: text
```

#### trace_logs
```sql
- id: uuid (primary key)
- level: text (log level: debug, info, warn, error)
- category: text (categorization of log)
- message: text
- payload: jsonb (structured data)
- user_id: uuid (foreign key to users.id, nullable)
- user_email: text
- session_id: text
- request_id: text
- source_file: text
- source_line: integer
- function_name: text
- ip_address: text
- user_agent: text
- environment: text
- is_client: boolean
- created_at: timestamp with time zone
```

#### trace_settings
```sql
- id: text (primary key)
- enabled: boolean
- retention_days: integer
- updated_at: timestamp with time zone
```

#### video_views
```sql
- id: uuid (primary key)
- video_id: uuid (foreign key to videos.id)
- user_id: uuid (foreign key to users.id)
- viewed_at: timestamp with time zone
- ip_address: text
- user_agent: text
```

#### user_video_views
```sql
- id: uuid (primary key)
- video_id: uuid (foreign key to videos.id)
- user_id: uuid (foreign key to users.id)
- viewed_at: timestamp with time zone
```

### Junction Tables

#### video_categories
```sql
- id: uuid (primary key)
- video_id: uuid (foreign key to videos.id)
- category_id: uuid (foreign key to categories.id)
- created_at: timestamp
```

#### video_performers
```sql
- id: uuid (primary key)
- video_id: uuid (foreign key to videos.id)
- performer_id: uuid (foreign key to performers.id)
- created_at: timestamp with time zone
```

#### user_favorites
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to users.id)
- video_id: uuid (foreign key to videos.id)
- created_at: timestamp
```

#### video_curriculums
```sql
- id: uuid (primary key)
- video_id: uuid (foreign key to videos.id)
- curriculum_id: uuid (foreign key to curriculums.id)
- created_at: timestamp
```

### Database Relationships

**User Relationships:**
- Users can create multiple videos (one-to-many via created_by)
- Users can be assigned to a curriculum set (many-to-one via curriculum_set_id)
- Users can have a current belt level (many-to-one via current_belt_id to curriculums)
- Users can be invited by other users (self-referential via invited_by)
- Users can approve other users (self-referential via approved_by)
- Users can favorite multiple videos (many-to-many via user_favorites)
- Users can send/receive multiple notifications (many-to-many via notifications)

**Curriculum Relationships:**
- Curriculum sets contain multiple curriculums (one-to-many via curriculum_set_id)
- Videos can belong to multiple curriculums (many-to-many via video_curriculums)

**Video Relationships:**
- Videos can have multiple categories (many-to-many via video_categories)
- Videos can have multiple performers (many-to-many via video_performers)
- Videos can have multiple curriculums (many-to-many via video_curriculums)
- Video views are tracked per user (one-to-many via video_views, user_video_views)

**Audit/Logging Relationships:**
- Audit logs reference actor and target users (many-to-one via actor_id, target_id)
- Trace logs can reference users (many-to-one via user_id)
- User logins track login history (one-to-many via user_id)

## Authentication & Authorization

### Authentication Flow
1. **Registration**: Users submit registration form → Creates pending user profile → Admin notification sent
2. **Approval**: Admin reviews and approves/rejects users → User gains access
3. **Login**: Email/password authentication via Supabase Auth
4. **Session Management**: Server-side session handling with middleware

### Authorization Levels
- **Unauthenticated**: Access to login/signup pages only
- **Pending User**: Access to pending approval page only
- **Student**: Access to video library filtered by assigned curriculum set, view favorites
- **Teacher**: View students in their school, edit student belt levels (read-only curriculum set display)
- **Head Teacher**: Manage students in their school, edit both curriculum set and belt levels, view analytics
- **Admin**: Full system access including user management, video management, curriculum sets management, notifications, audit logs

### Security Features
- Row Level Security (RLS) policies on all database tables
- Server-side session validation
- Protected routes via middleware
- Admin-only operations restricted by email verification
- Secure password reset functionality

## Component Architecture

### Layout Components
```
app/
├── layout.tsx (Root layout with fonts and metadata)
├── page.tsx (Home page with video library)
├── auth/
│   ├── login/page.tsx (Login page)
│   ├── sign-up/page.tsx (Registration page)
│   ├── reset-password/page.tsx (Password reset request)
│   ├── callback/route.ts (Auth callback handler)
│   └── confirm/
│       ├── page.tsx (Email confirmation page)
│       └── callback/route.ts (Confirmation callback)
├── admin/
│   ├── page.tsx (Admin dashboard)
│   ├── users/page.tsx (User management)
│   ├── videos/page.tsx (Video management)
│   ├── categories/page.tsx (Category management)
│   ├── performers/page.tsx (Performer management)
│   ├── notifications/page.tsx (Notification management)
│   ├── audit/page.tsx (Audit log dashboard)
│   ├── metadata/page.tsx (Curriculum sets management)
│   ├── trace/page.tsx (Trace log viewer)
│   ├── viewlog/page.tsx (Video view log dashboard)
│   └── debug/page.tsx (Admin debug tools)
├── students/page.tsx (Teacher/Head Teacher student management)
├── my-level/page.tsx (User's current curriculum level)
├── profile/page.tsx (User profile)
├── favorites/page.tsx (User favorites)
├── pending-approval/page.tsx (Pending approval status)
├── change-password/page.tsx (Password change form)
├── setup-admin/page.tsx (Initial admin setup)
├── student-view/page.tsx (Student-specific view)
├── contact/page.tsx (Contact information)
├── eula/page.tsx (End User License Agreement)
├── privacy-policy/page.tsx (Privacy Policy)
├── signout/page.tsx (Sign out confirmation)
├── error/page.tsx (Error handling page)
├── video/[id]/page.tsx (Individual video page)
└── api/
    ├── upload-profile-image/route.ts (Profile image upload)
    └── trace/route.ts (Trace logging endpoint)
```

### Component Hierarchy
```
Header/AdminHeader
├── NotificationBell
├── InviteUserModal
├── DonationModal
├── ContributeModal
└── AboutModal

VideoLibrary
├── CategoryFilter
├── CurriculumFilter
├── FilterModeToggle
├── FilterSection
├── MobileFilterDialog
├── SearchInput
├── SortControl
├── ViewToggle
├── VideoCard/VideoCardList
├── VideoModal
└── VideoPlayer

Admin Components
├── AdminStats
├── AdminDashboardClient
├── AdminRefreshButton
├── PendingUsers
├── UnconfirmedEmailUsers
├── UserManagement
├── StudentManagement (for Teachers/Head Teachers)
├── VideoManagement
├── VideoManagementPanel
├── CategoryManagement
├── PerformerManagement
├── CurriculumManagement
├── CurriculumSetsManagement
├── CurriculumModal
├── MetadataManagement
├── AdminNotificationManagement
├── AuditLogDashboard
├── TraceDashboard
├── ViewLogDashboard
└── DebugDashboard

User Components
├── UserFilter
├── UserSortControl
├── PaginationControls
├── TrainingBanner

Legal & Utility Components
├── LoadingProvider
├── LoadingSkeleton
├── LegalFooter
├── SessionTimeoutWarning
└── ThemeProvider
```

### Key Components

#### Header Components
- **Header**: Main navigation for authenticated users with role-based menu items
- **AdminHeader**: Specialized navigation for admin panel
- **NotificationBell**: Real-time notification dropdown with unread counts
- **InviteUserModal**: Modal for inviting new users via email
- **DonationModal**: PayPal/PayID donation interface
- **ContributeModal**: Information about contributing to the organization
- **AboutModal**: About the organization information

#### Video Components
- **VideoLibrary**: Main video browsing interface with search, filtering, and curriculum set awareness
- **VideoCard/VideoCardList**: Individual video display with favorites, metadata, and curriculum info
- **VideoModal**: Detailed video view modal with full metadata
- **VideoPlayer**: Video playback with controls
- **CategoryFilter**: Multi-select category filtering
- **CurriculumFilter**: Filter videos by curriculum/belt level
- **FilterModeToggle**: Toggle between filter modes
- **FilterSection**: Collapsible filter section container
- **MobileFilterDialog**: Mobile-responsive filter interface
- **SearchInput**: Full-text search input component
- **SortControl**: Video sorting options (date, title, duration)
- **ViewToggle**: Grid/list view toggle

#### Admin Components
- **AdminStats**: Dashboard metrics and statistics
- **AdminDashboardClient**: Client-side admin dashboard wrapper
- **UserManagement**: User approval, editing, role assignment, and deletion
- **StudentManagement**: Teacher/Head Teacher interface for managing students in their school
- **VideoManagement/VideoManagementPanel**: Video CRUD operations with curriculum assignment
- **CategoryManagement**: Category creation and management
- **PerformerManagement**: Performer database management
- **CurriculumManagement**: Belt level/curriculum management within sets
- **CurriculumSetsManagement**: Curriculum set CRUD operations
- **CurriculumModal**: Modal for creating/editing curriculum entries
- **MetadataManagement**: Combined curriculum sets and curricula management
- **AuditLogDashboard**: View admin action audit logs
- **TraceDashboard**: Application trace log viewer
- **ViewLogDashboard**: Video view statistics and logs
- **DebugDashboard**: Admin debug tools and diagnostics
- **PendingUsers**: Display and manage pending user approvals
- **UnconfirmedEmailUsers**: Manage users with unconfirmed emails

#### User Components
- **UserProfile**: Profile editing with image upload
- **ChangePasswordForm**: Secure password updates
- **UserFilter**: Filter users by various criteria
- **UserSortControl**: Sort user listings
- **PaginationControls**: Paginated list navigation
- **TrainingBanner**: Display user's current training level/belt

#### Utility Components
- **LoadingProvider**: Global loading state management
- **LoadingSkeleton**: Skeleton loading placeholders
- **LegalFooter**: Footer with links to EULA and Privacy Policy
- **SessionTimeoutWarning**: Warning modal for session expiration
- **ThemeProvider**: Dark/light theme management

## API & Server Actions

### Authentication Actions
```typescript
signIn(email, password) → Authenticates user and creates session
signUp(userData) → Creates pending user account
signOut() → Destroys session and redirects
changePassword(currentPassword, newPassword) → Updates user password
```

### User Management Actions
```typescript
approveUser(userId) → Approves pending user registration
rejectUser(userId) → Rejects and deletes user application
deleteUserCompletely(userId) → Complete user deletion
updateProfile(profileData) → Updates user profile information
inviteUser(email) → Sends user invitation via email
```

### Notification Actions
```typescript
sendNotificationWithEmail(recipientId, message, isBroadcast) → Sends notification with email
fetchNotificationsWithSenders(userId) → Retrieves user notifications with sender info
```

### Data Fetching Patterns
- Server-side data fetching in page components
- Client-side state management for interactive features
- Real-time updates for notifications
- Optimistic updates for user interactions

## Infrastructure & Deployment

### Hosting & Deployment
- **Platform**: Vercel (serverless functions)
- **Domain**: Custom domain support (tykobudo.com.au)
- **SSL**: Automatic HTTPS via Vercel
- **CDN**: Global edge network for static assets

### Database & Storage
- **Database**: Supabase PostgreSQL with automatic backups
- **File Storage**: Vercel Blob for profile images and assets
- **Email Service**: Resend for transactional emails

### Environment Configuration
```
# Supabase Configuration
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# PostgreSQL Configuration (from Supabase)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=
POSTGRES_HOST=
SUPABASE_JWT_SECRET=

# Email Configuration
RESEND_API_KEY=
FROM_EMAIL=

# File Storage
BLOB_READ_WRITE_TOKEN=

# Application URLs
NEXT_PUBLIC_FULL_SITE_URL=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=
```

### Performance Optimizations
- Server-side rendering for SEO and performance
- Image optimization via Next.js Image component
- Code splitting and lazy loading
- Database query optimization with proper indexing

## Key Features

### Video Library System
- **Video Management**: Upload, categorize, and publish videos
- **Search & Filtering**: Full-text search across titles, descriptions, and performers with curriculum set filtering
- **Categorization**: Multi-category tagging system
- **Performer Tagging**: Associate videos with specific martial artists
- **Curriculum Organization**: Videos organized by curriculum sets and belt levels within those sets
- **Favorites System**: Users can save and organize favorite videos

### Curriculum Sets System
- **Multiple Curriculum Support**: Organize belt levels into separate curriculum pathways (e.g., Okinawa Kobudo, Matayoshi)
- **Structured Content**: Each curriculum set contains ordered belt levels for progressive learning
- **User Assignment**: Head Teachers assign curriculum sets to students, controlling content access
- **Admin Management**: Full CRUD operations for curriculum sets and curricula from admin dashboard
- **Curriculum Grouping**: Videos associated with specific curricula within assigned curriculum sets
- **Flexible Organization**: Supports multiple, independent curriculum structures within single library

### User Management
- **Invite-Only Registration**: Admin approval required for new users
- **Role-Based Access**: Student, Teacher, Head Teacher, Admin roles with specific permissions
- **School-Based Filtering**: Teachers and Head Teachers only see students in their school
- **Curriculum Assignment**: Head Teachers can assign curriculum sets to students
- **Profile Management**: User profiles with image uploads
- **User Invitation**: Existing users can invite new members

### Communication System
- **Real-Time Notifications**: Bell notifications with unread counts
- **Email Integration**: Automatic email notifications for important events
- **Admin Messaging**: Direct communication between users and admin
- **Broadcast Messages**: Admin can send messages to all users

### Administrative Features
- **User Approval Workflow**: Review and approve new registrations
- **Content Management**: Full CRUD operations for videos, categories, performers
- **Analytics Dashboard**: User statistics and system metrics
- **Notification Management**: Send individual or broadcast messages

### Additional Features
- **Donation System**: PayPal and PayID donation options
- **Password Reset**: Secure password recovery via email
- **Responsive Design**: Mobile-friendly interface
- **Dark/Light Mode**: Theme support via Tailwind CSS

### Email System Features
- **Sender Display Name**: All emails sent from "OKL Admin" for consistent branding
- **HTML Email Templates**: Rich HTML formatting with proper sanitization
- **Notification Types**: User registration, approval, password reset, admin notifications
- **Email Verification**: Required for new user accounts and password resets

### Legal Compliance Features
- **EULA Tracking**: End User License Agreement acceptance tracking
- **Privacy Policy**: Comprehensive privacy policy with consent tracking
- **Contact Information**: Dedicated contact page for user inquiries
- **Consent Management**: User consent tracking for legal compliance

### Debug and Monitoring Features
- **Admin Debug Tools**: Comprehensive debugging interface for administrators
- **Trace Logging System**: Structured application logging with TraceLogger utility
  - Configurable log levels (debug, info, warn, error)
  - Client and server-side logging support
  - Session and request ID tracking
  - Retention policy management via trace_settings
- **Audit Logging**: All admin actions logged with actor, target, and action details
- **Authentication Logging**: Detailed logs of authentication events and errors
- **User Login Tracking**: IP address and user agent logging for security
- **Video View Analytics**: Track video views per user with timestamps
- **Error Monitoring**: Centralized error tracking and reporting

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Vercel account (for deployment)
- Resend account (for emails)

### Local Development
```bash
# Clone repository
git clone <repository-url>
cd vodlibrary-67

# Install dependencies (--legacy-peer-deps required for React 19)
npm install --legacy-peer-deps

# Set up environment variables
cp env.template .env.local
# Edit .env.local with your values - see template for full documentation

# Run development server
npm run dev
```

See the README.md "Local Development Setup" section for detailed step-by-step instructions including Supabase configuration, database migrations, and external service setup.

### Database Setup
1. Create Supabase project
2. Run database migrations (SQL scripts in /scripts folder)
3. Configure Row Level Security policies
4. Set up authentication providers

### Deployment
1. Connect repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set up custom domain (optional)
4. Configure Supabase redirect URLs for production

## Deployment Process

### Phase 1: Deploy and Test with Vercel Domain

**1. Setup Resend Domain Verification FIRST**
- Add `tykobudo.com.au` as verified domain in Resend
- Add required DNS records (SPF, DKIM, DMARC) to your domain
- Wait for verification to complete

**2. Update Environment Variables in Vercel**
- `FROM_EMAIL` → Update to `noreply@tykobudo.com.au`
- All other environment variables remain the same

**3. Click 'Publish' Button** (creates `tykobudo.vercel.app`)

**4. Update Supabase Configuration**
- **Site URL**: Set to `https://tykobudo.vercel.app` 
- **Redirect URLs**: Add `https://tykobudo.vercel.app/auth/callback`

**5. Test Everything on tykobudo.vercel.app**
- [ ] User registration and email confirmation
- [ ] Password reset functionality  
- [ ] Admin functions
- [ ] Video management
- [ ] Notifications (in-app and email)
- [ ] Invite user functionality

### Phase 2: Connect Custom Domain (After Testing)

**6. Configure Custom Domain in Vercel**
- Add `tykobudo.com.au` in Vercel project settings

**7. Update DNS for Vercel** (follow Vercel's instructions)

**8. Update Supabase Final Configuration**
- **Site URL**: Change to `https://tykobudo.com.au`
- **Redirect URLs**: Update to custom domain

### Post-Deployment Verification
- Verify all email templates work with custom domain
- Test all authentication flows
- Confirm admin functionality is working
- Validate donation links and PayPal integration

## Security Considerations

### Data Protection
- Row Level Security (RLS) on all database tables
- Server-side validation for all user inputs
- Secure session management with HTTP-only cookies
- Environment variable protection for sensitive data

### Authentication Security
- Secure password hashing via Supabase Auth
- Email verification for new accounts
- Password reset with time-limited tokens
- Admin-only operations protected by email verification

### Content Security
- Video URLs stored as references (not direct uploads)
- Profile image uploads via secure blob storage
- Input sanitization for user-generated content
- CORS configuration for API endpoints

### Monitoring & Logging
- Error tracking and logging
- Performance monitoring
- Security event logging
- Database query monitoring

---

## AI-Assisted Development

This project uses AI assistants (v0, Claude, etc.) for development. To ensure consistency and avoid common mistakes:

### Context File

**`/AI_CONTEXT.md`** contains project-specific rules, patterns, and learnings for AI agents. This file should be referenced at the start of each AI conversation.

### Key Points

- **Shared utilities exist** — Check `/lib/` before creating new patterns
- **TraceLogger for debugging** — Use `/lib/trace-logger.ts` instead of console.log
- **Supabase helpers** — Always use `createServerClient()` from `/lib/supabase/server.ts`
- **MCP tools available** — 29 Supabase tools accessible via ToolSearch

### Maintaining AI Context

The `AI_CONTEXT.md` file is updated only when the user explicitly requests it (e.g., after identifying a recurring mistake). This keeps the file curated and high-signal.

---

## Conclusion

The TY Kobudo Library represents a comprehensive, secure, and scalable solution for managing traditional martial arts training content. The architecture prioritizes security, user experience, and administrative control while maintaining flexibility for future enhancements.

The system successfully implements modern web development best practices with a focus on performance, security, and maintainability. The modular component architecture and clear separation of concerns ensure the system can evolve with changing requirements while maintaining stability and reliability.
