# Vercel Build Configuration

## How Tests Run on Vercel

The build process has been configured to automatically run tests during Vercel deployments.

### Build Script Chain

When Vercel runs `npm run build`, it now executes:
1. **Type Check** (`npm run type-check`) - Validates TypeScript types
2. **Tests** (`npm run test:ci`) - Runs all unit and component tests with coverage
3. **Build** (`next build`) - Builds the Next.js application

If any step fails, the deployment will fail and Vercel will not deploy the broken code.

### Build Scripts

- `npm run build` - Full CI/CD build with tests (used by Vercel)
- `npm run build:skip-tests` - Build without tests (for emergency deployments)
- `npm run test:ci` - Run tests in CI mode with verbose output and coverage

### Vercel Environment

Tests run in Vercel's build environment with:
- All your configured environment variables available
- Mock Supabase clients (from `tests/mocks/supabase.ts`)
- Coverage reports generated but not deployed (excluded by .gitignore)

### What Happens on Deployment

1. You push to GitHub (or click "Publish" in v0)
2. Vercel detects the change
3. Vercel runs `npm install`
4. Vercel runs `npm run build`:
   - TypeScript compilation check
   - All test suites execute
   - Coverage report generated
   - Next.js build
5. If all pass → Deployment succeeds
6. If any fail → Deployment fails with error logs

### Viewing Test Results

To see test results from a Vercel deployment:
1. Go to your Vercel project dashboard
2. Click on the deployment
3. View the "Build Logs" tab
4. Search for test output (look for "Test Files" and "Tests" sections)

### Emergency Bypass

If you need to deploy urgently without running tests:
1. Go to Vercel Project Settings
2. Override the build command to: `npm run build:skip-tests`
3. Deploy
4. **Remember to change it back afterwards!**

### GitHub Actions Integration

The `.github/workflows/sonarqube.yml` file runs tests independently:
- Runs on every push to main/master/develop
- Runs on every pull request
- Sends coverage to SonarCloud
- Checks quality gate

**Both Vercel AND GitHub Actions run tests** - this provides:
- Vercel: Prevents broken code from deploying
- GitHub: Provides code quality analysis and reporting

### Configuration Files

- `package.json` - Build scripts configuration
- `vitest.config.ts` - Test framework configuration
- `tests/setup.ts` - Test environment setup
- `sonar-project.properties` - SonarQube configuration

## Troubleshooting

### Tests Pass Locally But Fail on Vercel

- Check environment variables in Vercel dashboard
- Ensure test dependencies are in `devDependencies`
- Review Vercel build logs for specific error messages

### Build Takes Too Long

Tests add 30-60 seconds to build time. If this is too slow:
- Reduce test timeout in `vitest.config.ts`
- Skip E2E tests in CI (only run unit/component tests)
- Use `build:skip-tests` for non-critical deployments

### Want to Disable Tests in Vercel

In Vercel Project Settings → Build & Development Settings:
- Change Build Command to: `npm run build:skip-tests`
</parameter>
