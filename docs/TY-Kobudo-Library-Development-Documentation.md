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

## System Overview

The TY Kobudo Library is a private, invite-only video library system designed for traditional martial arts training content. The system serves Matayoshi/Okinawa Kobudo Australia students with curated video content, user management, and administrative capabilities.

### Core Objectives
- Provide secure access to traditional martial arts training videos
- Implement invite-only user registration with admin approval
- Enable content categorization and performer tagging
- Support real-time notifications and user communication
- Maintain comprehensive admin controls for content and user management

## High-Level Architecture

\`\`\`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Side   │    │   Server Side   │    │   External      │
│                 │    │                 │    │   Services      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ Next.js Pages   │◄──►│ Server Actions  │◄──►│ Supabase DB     │
│ React Components│    │ API Routes      │    │ Supabase Auth   │
│ Client State    │    │ Middleware      │    │ Resend Email    │
│ UI Components   │    │ Session Mgmt    │    │ Vercel Blob     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
\`\`\`

### Architecture Layers

1. **Presentation Layer**: Next.js 14 with App Router, React components, Tailwind CSS
2. **Business Logic Layer**: Server Actions, API routes, authentication middleware
3. **Data Layer**: Supabase PostgreSQL database with Row Level Security
4. **External Services**: Resend for emails, Vercel Blob for file storage

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS v4
- **Component Library**: shadcn/ui
- **Icons**: Lucide React
- **Fonts**: Geist (sans-serif), Manrope (serif)

### Backend
- **Runtime**: Node.js (Vercel serverless functions)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Email Service**: Resend
- **File Storage**: Vercel Blob

### Development Tools
- **Language**: TypeScript
- **Package Manager**: npm
- **Deployment**: Vercel
- **Version Control**: Git

## Database Schema

### Core Tables

#### users
\`\`\`sql
- id: uuid (primary key)
- email: text (unique)
- full_name: text
- profile_image_url: text
- school: text
- teacher: text
- role: text (Student/Teacher/Admin)
- is_approved: boolean
- approved_by: uuid (foreign key to users.id)
- approved_at: timestamp
- created_at: timestamp
- updated_at: timestamp
\`\`\`

#### videos
\`\`\`sql
- id: uuid (primary key)
- title: text
- description: text
- video_url: text
- thumbnail_url: text
- duration_seconds: integer
- recorded: text
- is_published: boolean
- created_by: uuid (foreign key to users.id)
- created_at: timestamp
- updated_at: timestamp
\`\`\`

#### categories
\`\`\`sql
- id: uuid (primary key)
- name: text
- description: text
- color: text
- created_by: uuid (foreign key to users.id)
- created_at: timestamp
\`\`\`

#### performers
\`\`\`sql
- id: uuid (primary key)
- name: character varying
- created_at: timestamp
\`\`\`

### Junction Tables

#### video_categories
\`\`\`sql
- id: uuid (primary key)
- video_id: uuid (foreign key to videos.id)
- category_id: uuid (foreign key to categories.id)
- created_at: timestamp
\`\`\`

#### video_performers
\`\`\`sql
- id: uuid (primary key)
- video_id: uuid (foreign key to videos.id)
- performer_id: uuid (foreign key to performers.id)
- created_at: timestamp
\`\`\`

#### user_favorites
\`\`\`sql
- id: uuid (primary key)
- user_id: uuid (foreign key to users.id)
- video_id: uuid (foreign key to videos.id)
- created_at: timestamp
\`\`\`

#### notifications
\`\`\`sql
- id: uuid (primary key)
- sender_id: uuid (foreign key to users.id)
- recipient_id: uuid (foreign key to users.id)
- message: text
- is_read: boolean
- is_broadcast: boolean
- created_at: timestamp
- updated_at: timestamp
\`\`\`

### Database Relationships
- Users can create multiple videos (one-to-many)
- Videos can have multiple categories (many-to-many via video_categories)
- Videos can have multiple performers (many-to-many via video_performers)
- Users can favorite multiple videos (many-to-many via user_favorites)
- Users can send/receive multiple notifications (many-to-many via notifications)

## Authentication & Authorization

### Authentication Flow
1. **Registration**: Users submit registration form → Creates pending user profile → Admin notification sent
2. **Approval**: Admin reviews and approves/rejects users → User gains access
3. **Login**: Email/password authentication via Supabase Auth
4. **Session Management**: Server-side session handling with middleware

### Authorization Levels
- **Unauthenticated**: Access to login/signup pages only
- **Pending User**: Access to pending approval page only
- **Approved User**: Full access to video library and user features
- **Admin**: Full system access including admin panel

### Security Features
- Row Level Security (RLS) policies on all database tables
- Server-side session validation
- Protected routes via middleware
- Admin-only operations restricted by email verification
- Secure password reset functionality

## Component Architecture

### Layout Components
\`\`\`
app/
├── layout.tsx (Root layout with fonts and metadata)
├── page.tsx (Home page with video library)
├── auth/
│   ├── login/page.tsx (Login page)
│   └── sign-up/page.tsx (Registration page)
├── admin/
│   ├── page.tsx (Admin dashboard)
│   ├── users/page.tsx (User management)
│   ├── videos/page.tsx (Video management)
│   ├── categories/page.tsx (Category management)
│   ├── performers/page.tsx (Performer management)
│   └── notifications/page.tsx (Notification management)
├── profile/page.tsx (User profile)
├── favorites/page.tsx (User favorites)
└── video/[id]/page.tsx (Individual video page)
\`\`\`

### Component Hierarchy
\`\`\`
Header/AdminHeader
├── NotificationBell
├── InviteUserModal
└── DonationModal

VideoLibrary
├── CategoryFilter
├── SortControl
├── ViewToggle
├── VideoCard/VideoCardList
└── VideoPlayer

Admin Components
├── AdminStats
├── PendingUsers
├── UserManagement
├── VideoManagement
├── CategoryManagement
├── PerformerManagement
└── AdminNotificationManagement
\`\`\`

### Key Components

#### Header Components
- **Header**: Main navigation for authenticated users
- **AdminHeader**: Specialized navigation for admin panel
- **NotificationBell**: Real-time notification dropdown

#### Video Components
- **VideoLibrary**: Main video browsing interface with search and filtering
- **VideoCard**: Individual video display with favorites and metadata
- **VideoPlayer**: Video playback with controls
- **CategoryFilter**: Multi-select category filtering
- **SortControl**: Video sorting options (date, title, duration)

#### Admin Components
- **AdminStats**: Dashboard metrics and statistics
- **UserManagement**: User approval, editing, and deletion
- **VideoManagement**: Video CRUD operations
- **CategoryManagement**: Category creation and management
- **PerformerManagement**: Performer database management

#### User Components
- **UserProfile**: Profile editing with image upload
- **FavoritesLibrary**: User's favorited videos
- **ChangePasswordForm**: Secure password updates

## API & Server Actions

### Authentication Actions
\`\`\`typescript
signIn(email, password) → Authenticates user and creates session
signUp(userData) → Creates pending user account
signOut() → Destroys session and redirects
changePassword(currentPassword, newPassword) → Updates user password
\`\`\`

### User Management Actions
\`\`\`typescript
approveUser(userId) → Approves pending user registration
rejectUser(userId) → Rejects and deletes user application
deleteUserCompletely(userId) → Complete user deletion
updateProfile(profileData) → Updates user profile information
inviteUser(email) → Sends user invitation via email
\`\`\`

### Notification Actions
\`\`\`typescript
sendNotificationWithEmail(recipientId, message, isBroadcast) → Sends notification with email
fetchNotificationsWithSenders(userId) → Retrieves user notifications with sender info
\`\`\`

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
\`\`\`
# Supabase Configuration
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Email Configuration
RESEND_API_KEY=
FROM_EMAIL=

# File Storage
BLOB_READ_WRITE_TOKEN=

# Application URLs
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=
\`\`\`

### Performance Optimizations
- Server-side rendering for SEO and performance
- Image optimization via Next.js Image component
- Code splitting and lazy loading
- Database query optimization with proper indexing

## Key Features

### Video Library System
- **Video Management**: Upload, categorize, and publish videos
- **Search & Filtering**: Full-text search across titles, descriptions, and performers
- **Categorization**: Multi-category tagging system
- **Performer Tagging**: Associate videos with specific martial artists
- **Favorites System**: Users can save and organize favorite videos

### User Management
- **Invite-Only Registration**: Admin approval required for new users
- **Role-Based Access**: Student, Teacher, Admin roles
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

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Vercel account (for deployment)
- Resend account (for emails)

### Local Development
\`\`\`bash
# Clone repository
git clone <repository-url>
cd ty-kobudo-library

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Configure all required environment variables

# Run development server
npm run dev
\`\`\`

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

## Conclusion

The TY Kobudo Library represents a comprehensive, secure, and scalable solution for managing traditional martial arts training content. The architecture prioritizes security, user experience, and administrative control while maintaining flexibility for future enhancements.

The system successfully implements modern web development best practices with a focus on performance, security, and maintainability. The modular component architecture and clear separation of concerns ensure the system can evolve with changing requirements while maintaining stability and reliability.
