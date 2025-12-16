# Deployment & Testing Verification Checklist

## Pre-Deployment Setup

### Environment Variables Required

**Existing (already configured)**:
- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `BLOB_READ_WRITE_TOKEN`
- All other existing env vars

**New for CI/CD (to be added in Vercel)**:
- `SONAR_TOKEN` - Get from SonarCloud project settings
- `SONAR_HOST_URL` - Set to `https://sonarcloud.io`

### SonarQube Setup

1. Go to SonarCloud project settings
2. Navigate to Administration → Security
3. Generate a new token with name "Vercel CI/CD"
4. Copy the token value
5. Add as `SONAR_TOKEN` in Vercel environment variables

### Vercel Build Settings

**Build Command**: `npm run build`
**Install Command**: `npm install`
**Framework**: Next.js

## Post-Deployment Verification

### 1. Application Functionality

- [ ] Homepage loads correctly
- [ ] Video library displays and filters work
- [ ] My Level page shows correct belt information
- [ ] Admin pages accessible with proper authentication
- [ ] Video playback functions
- [ ] User profile updates work

### 2. Testing Infrastructure

Run these commands in your local clone:

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Check for test failures
# Expected: All tests should pass

# Generate coverage report
npm run test:coverage

# Check coverage/index.html in browser
# Expected: ~50% coverage

# Run type checking
npm run type-check

# Expected: No TypeScript errors

# Run linting
npm run lint

# Expected: No ESLint errors (or only warnings)
```

### 3. SonarQube Analysis

After pushing to GitHub (or deploying to Vercel):

1. Wait 2-5 minutes for analysis to complete
2. Go to SonarCloud dashboard
3. Check your project

**Expected Results**:
- Project appears in SonarCloud
- Code coverage reported (~50%)
- Quality Gate status visible
- Issues categorized (Bugs, Vulnerabilities, Code Smells)

### 4. Git Hooks

Test the pre-commit hook:

```bash
# Make a small change to any file
# Try to commit
git add .
git commit -m "test commit"

# Expected: lint-staged runs automatically
# Expected: Code is formatted before commit
```

## Troubleshooting

### Tests Fail Locally

**Issue**: `npm test` fails with module not found

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
npm test
```

### SonarQube Not Showing Results

**Issue**: No analysis appears in SonarCloud

**Solutions**:
1. Verify `SONAR_TOKEN` is set in Vercel
2. Check build logs for sonar-scanner errors
3. Verify `sonar-project.properties` exists in root
4. Check SonarCloud project key matches

### Husky Hooks Not Working

**Issue**: Pre-commit hook doesn't run

**Solution**:
```bash
npm run prepare
git config core.hooksPath .husky
```

### TypeScript Errors After Deployment

**Issue**: Build fails due to type errors

**Solution**:
1. Run `npm run type-check` locally
2. Fix reported errors
3. Commit and push fixes

## Success Criteria

✅ **Application**: All features work in production
✅ **Tests**: All test suites pass locally
✅ **Coverage**: ~50% reported in SonarQube
✅ **Quality**: No Critical or Blocker issues in SonarQube
✅ **CI/CD**: Automated analysis runs on each deployment
✅ **Git Hooks**: Pre-commit formatting works

## Next Phase

After verification is complete:

1. Review SonarQube analysis for issues to address
2. Implement remaining component tests
3. Add E2E tests for critical user flows
4. Work toward 70% code coverage goal
5. Address any Security Hotspots found by SonarQube
