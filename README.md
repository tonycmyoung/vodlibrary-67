# TY Kobudo Library

*Traditional Martial Arts Video Library System*

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=tonycmyoung_vodlibrary-67&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=tonycmyoung_vodlibrary-67)

## Overview

The TY Kobudo Library is a private, invite-only video library system designed for traditional martial arts training content. Built specifically for Matayoshi/Okinawa Kobudo Australia students, it provides secure access to curated video content with comprehensive user management and administrative capabilities.

## Key Features

- **Invite-Only Access**: Admin-approved user registration system
- **Video Library**: Categorized martial arts training videos with search and filtering by curriculum sets
- **Curriculum Sets**: Organize belt-levels into structured curriculum pathways (e.g., Okinawa Kobudo, Matayoshi)
- **User Management**: Role-based access (Student, Teacher, Head Teacher, Admin) with granular permissions
  - **Admin**: Full system access, manage all users and content
  - **Head Teacher**: Manage students within their school, assign curriculum sets and belt levels
  - **Teacher**: View and track students within their school, can only edit belt levels
  - **Student**: Access videos within their assigned curriculum set
- **School Separation**: Teachers and Head Teachers can only view/manage students within their school
- **Curriculum System**: Belt-level curriculum tracking with ordered content organized by curriculum sets
- **Real-Time Notifications**: In-app messaging and email notifications
- **Content Management**: Full CRUD operations for videos, categories, performers, curriculum sets, and belt levels
- **Favorites System**: Users can save and organize favorite videos
- **Legal Compliance**: EULA and Privacy Policy tracking with consent management
- **Audit Logging**: Comprehensive admin action logging for all system changes
- **Email System**: Rich HTML emails with "OKL Admin" branding
- **Donation Integration**: PayPal and PayID donation options
- **Responsive Design**: Mobile-friendly interface across all user roles

## Technology Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS v4, shadcn/ui
- **Backend**: Supabase PostgreSQL, Supabase Auth, Row Level Security
- **Testing**: Vitest, React Testing Library
- **Code Quality**: ESLint, Prettier, SonarCloud
- **Services**: Resend (email), Vercel Blob (file storage)
- **Deployment**: Vercel
- **CI/CD**: GitHub Actions with automated testing and quality analysis

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install --legacy-peer-deps`
3. Set up environment variables (see [Environment Variables](#environment-variables))
4. Run development server: `npm run dev`

## Available Scripts

\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm test             # Run tests
npm run test:coverage # Run tests with coverage report
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
\`\`\`

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
\`\`\`

## Documentation

- **[Development Documentation](docs/TY-Kobudo-Library-Development-Documentation.md)** - Architecture, database schema, curriculum system design, and detailed technical documentation
- **[Deployment Guide](docs/DEPLOYMENT_AND_TESTING_GUIDE.md)** - Deployment and testing instructions
- **[Curriculum Sets Architecture](docs/CURRICULUM_SETS_GUIDE.md)** - Curriculum sets system design, grouping logic, and admin workflows
- **[Contributing](CONTRIBUTING.md)** - Guidelines for contributing to this project
- **[Security Policy](SECURITY.md)** - How to report security vulnerabilities
- **[License](LICENSE.md)** - License and usage terms

## Curriculum Sets System

The Curriculum Sets system organizes belt levels into structured curriculum pathways, allowing the organization to manage multiple curricula (e.g., Okinawa Kobudo, Matayoshi) within a single video library. Key aspects:

- **Admin Management**: Admins can create and manage curriculum sets from the admin dashboard
- **Content Organization**: Videos are associated with specific belt levels within curriculum sets
- **User Assignment**: Head Teachers assign curriculum sets to students, determining which videos they can access
- **Admin Filtering**: Video management pages display curriculum levels grouped by set for easier organization
- **User Views**: Student-facing video library is filtered to only show videos from their assigned curriculum set

For detailed information on the curriculum sets architecture and implementation, see [Curriculum Sets Architecture](docs/CURRICULUM_SETS_GUIDE.md).

## License

This project is proprietary software. See [LICENSE.md](LICENSE.md) for full license terms and usage restrictions.
