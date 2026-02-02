# Deployment and Testing Guide

## Overview

This document explains how to deploy the application and run the test suite.

## Deployment

### Vercel Deployment

The application is deployed to Vercel with automatic deployments on push to the main branch.

**Build Command**: `npm run build`
**Install Command**: `npm install --legacy-peer-deps`

### Environment Variables

Required environment variables (configure in Vercel dashboard):

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
RESEND_API_KEY
FROM_EMAIL
BLOB_READ_WRITE_TOKEN
NEXT_PUBLIC_FULL_SITE_URL
NEXT_PUBLIC_SITE_URL
```

### Supabase Configuration

1. Set **Site URL** to your production domain
2. Add **Redirect URLs** for auth callbacks:
   - `https://your-domain.com/auth/callback`
   - `https://your-domain.com/auth/confirm/callback`

## Testing

### Running Tests Locally

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

```
tests/
├── components/     # Component tests (48 files)
├── unit/           # Unit tests (21 files)
│   ├── app/        # Route handler tests
│   └── lib/        # Action and utility tests
├── mocks/          # Mock utilities
├── utils/          # Test helpers
└── setup.ts        # Test configuration
```

### Code Quality Tools

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Fix formatting
npm run format

# Type checking
npm run type-check
```

## CI/CD Pipeline

### GitHub Actions

The `.github/workflows/sonarqube.yml` workflow runs on every push:
1. Installs dependencies
2. Runs tests with coverage
3. Sends results to SonarCloud

### SonarCloud

Code quality analysis is available at:
https://sonarcloud.io/project/overview?id=tonycmyoung_vodlibrary-67

### Required GitHub Secrets

- `SONAR_TOKEN` - SonarCloud authentication token

## Troubleshooting

### Dependency Installation Fails

Use `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

This is required because React 19 has peer dependency conflicts with some packages.

### Tests Fail Locally

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   ```

2. Verify Node.js version (v18 or v20 required)

### Build Fails on Vercel

1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Test build locally: `npm run build`
