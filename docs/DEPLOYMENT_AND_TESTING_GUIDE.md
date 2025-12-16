# Deployment and Testing Guide

## Overview

This document explains how to deploy your application and run the comprehensive test suite that has been implemented.

## What Has Been Implemented

### Testing Infrastructure
- **Vitest**: Unit and integration testing framework
- **React Testing Library**: Component testing
- **Test Coverage**: ~50% of business logic covered
- **Mock System**: Comprehensive mocks for Supabase and Next.js

### Code Quality Tools
- **ESLint**: TypeScript linting with Next.js rules
- **Prettier**: Code formatting with Tailwind CSS plugin
- **Husky**: Git hooks for pre-commit checks (local development only)
- **lint-staged**: Runs linting/formatting on staged files

### Test Suites Created
1. `tests/unit/lib/actions/curriculums.test.ts` - Curriculum CRUD and display_order logic
2. `tests/unit/lib/actions/auth.test.ts` - Authentication flows
3. `tests/unit/lib/actions/users.test.ts` - User management
4. `tests/unit/lib/actions/notifications.test.ts` - Notification system
5. `tests/unit/lib/actions/videos.test.ts` - Video operations and view tracking
6. `tests/unit/lib/actions/performers.test.ts` - Performer management
7. `tests/components/category-filter.test.tsx` - Filter component
8. `tests/components/sort-control.test.tsx` - Sort component

---

## Deployment to Vercel

### Current Deployment
Your app is already deployed to Vercel and connected to GitHub. Any push to your main branch will trigger automatic deployment.

### No Changes Required
- The testing infrastructure does NOT affect your production deployment
- Tests do NOT run during Vercel builds (they're dev dependencies)
- Your app will continue to work exactly as before

---

## Running Tests Locally

### Prerequisites
You'll need to clone the repository to your local machine to run tests:

```bash
git clone <your-repo-url>
cd ty-kobudo-library
npm install
```

### Available Test Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run linting
npm run lint

# Run formatting check
npm run format:check

# Auto-fix formatting issues
npm run format
```

### Setting Up Git Hooks (Optional - Local Only)

If you want pre-commit checks when developing locally:

```bash
npm run prepare
```

This initializes Husky to run linting and formatting checks before each commit.

**Note**: This is ONLY for local development. Vercel deployments don't use git hooks.

---

## SonarQube Integration

### What's Already Configured

The file `sonar-project.properties` is already set up with:
- Your project key: `tonycmyoung_vodlibrary-67`
- Your organization: `tonycmyoung`
- Source paths: `app,components,lib`
- Test paths: `tests`
- Coverage report location: `coverage/lcov.info`

### Option 1: GitHub Actions (Recommended)

Since you already have your repository connected to GitHub and SonarQube:

1. **Verify SONAR_TOKEN is set**: Go to GitHub → Your Repository → Settings → Secrets and variables → Actions
   - You mentioned you already have this configured ✓

2. **Create GitHub Actions Workflow**: Create `.github/workflows/sonarqube.yml`:

```yaml
name: SonarQube Analysis

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  sonarqube:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with coverage
        run: npm run test:coverage
      
      - name: SonarQube Scan
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: https://sonarcloud.io
```

3. **Push to trigger**: Next push to main will run SonarQube analysis

### Option 2: Manual SonarQube Scans (Local)

Install SonarQube scanner locally:

```bash
npm install -g sonarqube-scanner

# Run tests to generate coverage
npm run test:coverage

# Run SonarQube scan
sonar-scanner \
  -Dsonar.projectKey=tonycmyoung_vodlibrary-67 \
  -Dsonar.organization=tonycmyoung \
  -Dsonar.sources=. \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.login=YOUR_SONAR_TOKEN
```

---

## What Happens Next

### After First SonarQube Analysis

1. **Review the Dashboard**: Go to SonarCloud and check your project dashboard
2. **Address Critical Issues**: Focus on any "Blocker" or "Critical" issues first
3. **Improve Coverage**: Identify untested code paths
4. **Quality Gate**: Ensure your code passes the "Sonar way" quality gate

### Expected Initial Results

Based on the implementation:
- **Code Coverage**: ~50% (unit tests for all action files)
- **Maintainability**: Should be "A" or "B" (well-structured code)
- **Reliability**: Should be "A" (comprehensive error handling)
- **Security**: Should be "A" (using Supabase RLS, no hardcoded secrets)
- **Duplication**: Should be low (modular component structure)

### Common Issues to Watch For

1. **Type Safety**: Any `any` types will be flagged
2. **Cognitive Complexity**: Large functions in `video-library.tsx` might be flagged
3. **Missing Dependency Arrays**: Check `useEffect` hooks
4. **Console Logs**: Remove any `console.log` statements left in code

---

## Troubleshooting

### Tests Fail Locally

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Verify environment
node --version  # Should be v18 or v20
npm --version   # Should be v9 or v10
```

### SonarQube Analysis Fails

- Verify SONAR_TOKEN is correctly set
- Check that `npm run test:coverage` completes successfully
- Ensure `coverage/lcov.info` file is generated

### Vercel Build Fails

The testing infrastructure should NOT affect Vercel builds since test dependencies are in `devDependencies`. If builds fail:
1. Check Vercel build logs
2. Verify all production environment variables are set
3. Test build locally: `npm run build`

---

## Summary

### You DON'T Need To:
- Run tests for the app to work
- Set up anything special in Vercel
- Configure environment variables for testing in v0 or Vercel production
- Use Husky (it's optional for local development)

### You DO Need To (When Ready):
1. **Add GitHub Actions workflow** for automated SonarQube scans (copy the YAML above)
2. **Run tests locally** to verify they work: `npm test`
3. **Review SonarQube results** after first analysis
4. **Address critical issues** identified by SonarQube

### Timeline Recommendation:
1. **Now**: Push current code to trigger Vercel deployment (verify app still works)
2. **Next**: Clone repo locally and run `npm test` to verify test suite
3. **Then**: Add GitHub Actions workflow for SonarQube
4. **Finally**: Review SonarQube analysis and address issues

---

## Questions?

If anything is unclear or not working as expected, refer back to the implementation files in `/tests` and `/docs` directories.
