# TY Kobudo Library

*Traditional Martial Arts Video Library System*

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=tonycmyoung_vodlibrary-67&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=tonycmyoung_vodlibrary-67)

## Overview

The TY Kobudo Library is a private, invite-only video library system designed for traditional martial arts training content. Built specifically for Matayoshi/Okinawa Kobudo Australia students, it provides secure access to curated video content with comprehensive user management and administrative capabilities.

## Key Features

- **Invite-Only Access**: Admin-approved user registration system
- **Video Library**: Categorized martial arts training videos with search and filtering
- **User Management**: Role-based access (Student, Teacher, Head Teacher, Admin)
- **School Separation**: Teachers and Head Teachers can only view/manage students within their school
- **Curriculum System**: Belt-level curriculum tracking with ordered content
- **Real-Time Notifications**: In-app messaging and email notifications
- **Content Management**: Full CRUD operations for videos, categories, performers, and curriculums
- **Favorites System**: Users can save and organize favorite videos
- **Legal Compliance**: EULA and Privacy Policy tracking with consent management
- **Audit Logging**: Comprehensive admin action logging
- **Email System**: Rich HTML emails with "OKL Admin" branding
- **Donation Integration**: PayPal and PayID donation options
- **Responsive Design**: Mobile-friendly interface

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

- **[Development Documentation](docs/TY-Kobudo-Library-Development-Documentation.md)** - Architecture, database schema, and detailed technical documentation
- **[Deployment Guide](docs/DEPLOYMENT_AND_TESTING_GUIDE.md)** - Deployment and testing instructions
- **[Contributing](CONTRIBUTING.md)** - Guidelines for contributing to this project
- **[Security Policy](SECURITY.md)** - How to report security vulnerabilities

## License

Private project for Matayoshi/Okinawa Kobudo Australia.
