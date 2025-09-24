# TY Kobudo Library

*Traditional Martial Arts Video Library System*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/acmyma-9669s-projects/v0-netflix-like-video-library)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/2m1cV7hrzlw)

## Overview

The TY Kobudo Library is a private, invite-only video library system designed for traditional martial arts training content. Built specifically for Matayoshi/Okinawa Kobudo Australia students, it provides secure access to curated video content with comprehensive user management and administrative capabilities.

## Key Features

- **Invite-Only Access**: Admin-approved user registration system
- **Video Library**: Categorized martial arts training videos with search and filtering
- **User Management**: Role-based access (Student, Teacher, Admin)
- **Real-Time Notifications**: In-app messaging and email notifications
- **Content Management**: Full CRUD operations for videos, categories, and performers
- **Favorites System**: Users can save and organize favorite videos
- **Legal Compliance**: EULA and Privacy Policy tracking with consent management
- **Debug Tools**: Comprehensive admin debugging and monitoring interface
- **Email System**: Rich HTML emails with "OKL Admin" branding
- **Donation Integration**: PayPal and PayID donation options
- **Responsive Design**: Mobile-friendly interface

## Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS v4, shadcn/ui
- **Backend**: Node.js, Supabase PostgreSQL, Supabase Auth
- **Services**: Resend (email), Vercel Blob (file storage)
- **Deployment**: Vercel
- **Fonts**: Geist (sans-serif), Manrope (serif)

## Application Structure

### Main Pages
- **Home**: Video library with search, filtering, and categorization
- **Authentication**: Login, signup, email confirmation, password reset
- **User Areas**: Profile management, favorites, pending approval status
- **Admin Panel**: User management, content management, notifications, debug tools
- **Legal Pages**: Contact, EULA, Privacy Policy
- **Utility Pages**: Student view, admin setup, error handling

### Key Features
- **12 Database Tables**: Comprehensive data model with proper relationships
- **Authentication Logging**: Detailed security and debug logging
- **Consent Tracking**: Legal compliance with EULA and privacy consent
- **Email Templates**: Rich HTML emails with proper sanitization
- **Admin Debug Tools**: Comprehensive monitoring and troubleshooting interface

## Environment Variables

The application requires the following environment variables:

\`\`\`bash
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
NEXT_PUBLIC_FULL_SITE_URL=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=
\`\`\`

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see above)
4. Run development server: `npm run dev`

## Documentation

For comprehensive development documentation including architecture, database schema, and deployment guides, see:

📖 **[Full Development Documentation](docs/TY-Kobudo-Library-Development-Documentation.md)**

## Deployment

Your project is live at:

**[https://vercel.com/acmyma-9669s-projects/v0-netflix-like-video-library](https://vercel.com/acmyma-9669s-projects/v0-netflix-like-video-library)**

## Development

Continue building your app on:

**[https://v0.app/chat/projects/2m1cV7hrzlw](https://v0.app/chat/projects/2m1cV7hrzlw)**

## License

Private project for Matayoshi/Okinawa Kobudo Australia.
