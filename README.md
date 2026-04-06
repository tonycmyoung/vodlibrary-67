# TY Kobudo Library

*Traditional Martial Arts Video Library System*

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=tonycmyoung_kobudo-library&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=tonycmyoung_kobudo-library)

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

## Local Development Setup

### Prerequisites

- **Node.js**: v18 or v20 (required)
- **npm**: Comes with Node.js
- **Supabase Account**: Required for database and authentication
- **Resend Account**: Required for email functionality
- **Vercel Account**: Optional, for blob storage and deployment

### Step 1: Clone and Install

\`\`\`bash
git clone https://github.com/tonycmyoung/kobudo-library.git
cd kobudo-library
npm install --legacy-peer-deps
\`\`\`

### Step 2: Configure Environment Variables

\`\`\`bash
cp env.template .env.local
\`\`\`

Edit `.env.local` and fill in your values. See [Environment Variables](#environment-variables) for details on each variable.

### Step 3: Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your API keys from **Project Settings > API**
3. Run database migrations:
   - Navigate to **SQL Editor** in Supabase dashboard
   - Execute the SQL scripts from `/scripts` folder in order
4. Configure authentication in **Auth > Providers > Email**:
   - **Site URL**: Set to the value of `NEXT_PUBLIC_SITE_URL` (e.g., `http://localhost:3000` for local development)
   - **Redirect URLs**: Add the values corresponding to your environment:
     - For local: `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/confirm/callback`
     - For production: Use your domain (e.g., `https://your-domain.com/auth/callback` and `https://your-domain.com/auth/confirm/callback`)

### Step 4: Set Up External Services

**Resend (Email)**:
1. Sign up at [resend.com](https://resend.com)
2. Create an API key and add to `.env.local`
3. For production, verify your sending domain

**Vercel Blob (Profile Images)**:
1. Create a blob store in Vercel dashboard
2. Get the read/write token and add to `.env.local`
3. For local development without images, this can be skipped initially

**Stripe (Optional - Donations/Subscriptions)**:
1. Get API keys from [Stripe Dashboard](https://dashboard.stripe.com)
2. Create products and price IDs for subscription tiers

### Step 5: Run Development Server

\`\`\`bash
npm run dev
\`\`\`

The application will be available at `http://localhost:3000`

### Step 6: Create Initial Admin User

The initial admin user must be created with full admin privileges and pre-approved status. There are two approaches:

**Option A: Using the Setup Admin Page (Recommended)**
1. Navigate to `http://localhost:3000/setup-admin`
2. Use the form to create the first admin user
3. This user will be created with `role: Admin` and `is_approved: true`

**Option B: Direct Database Setup**
1. Connect to your Supabase database directly
2. Execute SQL to insert an admin user:
   \`\`\`sql
   INSERT INTO users (id, email, full_name, role, is_approved, approved_at, created_at, updated_at)
   VALUES (
     gen_random_uuid(),
     'admin@example.com',
     'Admin User',
     'Admin',
     true,
     NOW(),
     NOW(),
     NOW()
   );
   \`\`\`
3. The `ADMIN_USER` environment variable serves as a fallback bypass for admin access in case of database issues, but does not automatically grant privileges

**Note**: Regular user registration goes through an approval flow—new users are created with `is_approved: false` and must be approved by an admin before gaining access.

## Available Scripts

\`\`\`bash
npm run dev           # Start development server
npm run build         # Build for production
npm test              # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint          # Run ESLint
npm run lint:fix      # Fix linting issues
npm run format        # Format code with Prettier
npm run format:check  # Check formatting
npm run type-check    # Run TypeScript type checking
\`\`\`

## Environment Variables

Copy `env.template` to `.env.local` for a fully documented template. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side Supabase key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Yes | Client-safe Supabase key |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `FROM_EMAIL` | Yes | Verified sender email address |
| `ADMIN_EMAIL` | Yes | Admin notification recipient |
| `ADMIN_USER` | Yes | Super admin login email (bootstrap access) |
| `BLOB_READ_WRITE_TOKEN` | Yes* | Vercel Blob storage token |
| `NEXT_PUBLIC_FULL_SITE_URL` | Yes | Production site URL (used in emails/links) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Current deployment URL (for auth redirects) |
| `STRIPE_SECRET_KEY` | No | Stripe server-side key (use test keys for non-prod) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Stripe client-side key (use test keys for non-prod) |
| `NEXT_PUBLIC_DONATE_PAYID` | No | PayID for donations |

*Profile image uploads will fail without blob storage configured.

See `env.template` for a complete list with descriptions.

## Documentation

- **[Development Documentation](docs/TY-Kobudo-Library-Development-Documentation.md)** - Architecture, database schema, and detailed technical documentation
- **[Curriculum Sets Guide](docs/CURRICULUM_SETS_GUIDE.md)** - Curriculum system design, admin workflows, and role permissions
- **[Deployment Guide](docs/DEPLOYMENT_AND_TESTING_GUIDE.md)** - Deployment and testing instructions
- **[Contributing](CONTRIBUTING.md)** - Guidelines for contributing to this project
- **[Security Policy](SECURITY.md)** - How to report security vulnerabilities
- **[License](LICENSE.md)** - License and usage terms

## License

This project is proprietary software. See [LICENSE.md](LICENSE.md) for full license terms and usage restrictions.

---
*Last updated: April 2026*
