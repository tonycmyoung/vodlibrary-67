# SonarQube Integration Implementation Plan

## Overview
Implementation plan for code quality improvements, automated testing, and CI/CD integration following SonarQube best practices.

## Current Status
- ✅ SonarQube Cloud connected to GitHub repository
- ✅ Basic project settings configured (exclusions set by user)
- ⏳ Initial analysis in progress
- 🔄 Implementation phases below

---

## Phase 1: Testing Infrastructure Setup
**Status:** Not Started  
**Estimated Time:** 2-3 hours

### Tasks:
- [ ] Install testing dependencies (Vitest, React Testing Library, Playwright, MSW)
- [ ] Create vitest.config.ts
- [ ] Create test setup files and utilities
- [ ] Create mock Supabase clients
- [ ] Add test scripts to package.json
- [ ] Verify basic test runs

### Files to Create:
- `vitest.config.ts`
- `tests/setup.ts`
- `tests/mocks/supabase.ts`
- `tests/mocks/next-navigation.ts`

---

## Phase 2: Pre-emptive Code Improvements
**Status:** Not Started  
**Estimated Time:** 3-4 hours

### Priority A - Type Safety (High Impact, Low Risk)
- [ ] Add explicit return types to `/lib/actions/videos.ts`
- [ ] Add explicit return types to `/lib/actions/auth.tsx`
- [ ] Add explicit return types to `/lib/actions/users.tsx`
- [ ] Add explicit return types to `/lib/actions/curriculums.ts`
- [ ] Add explicit return types to `/lib/actions/categories.ts`
- [ ] Add explicit return types to `/lib/actions/performers.ts`
- [ ] Add explicit return types to `/lib/actions/notifications.tsx`
- [ ] Search for and replace any `: any` types with proper types

### Priority B - Error Handling (Medium Impact, Low Risk)
- [ ] Standardize error response format across all actions
- [ ] Add error boundary components for critical UI sections
- [ ] Improve client-side error handling in forms

### Priority C - Code Organization (Low Risk)
- [ ] Extract duplicated Supabase query patterns into utilities
- [ ] Document complex functions with JSDoc comments
- [ ] Add TypeScript strict mode checks gradually

### Files to Review:
- All files in `/lib/actions/*`
- Complex components: `video-library.tsx`, `student-management.tsx`, `user-management.tsx`

---

## Phase 3: Unit Tests - Critical Business Logic
**Status:** Not Started  
**Estimated Time:** 4-5 hours

### Priority Order:
1. [ ] `lib/actions/curriculums.ts` - Test display_order resequencing (recent bug fix!)
2. [ ] `lib/actions/videos.ts` - Test video CRUD operations
3. [ ] `lib/actions/auth.tsx` - Test authentication flows
4. [ ] `lib/actions/users.tsx` - Test user management (role updates, belt updates)
5. [ ] `lib/actions/categories.ts` - Test category operations
6. [ ] `lib/actions/performers.ts` - Test performer operations
7. [ ] `lib/utils.ts` - Test utility functions

### Test Files to Create:
- `tests/unit/lib/actions/curriculums.test.ts`
- `tests/unit/lib/actions/videos.test.ts`
- `tests/unit/lib/actions/auth.test.ts`
- `tests/unit/lib/actions/users.test.ts`
- `tests/unit/lib/utils.test.ts`

---

## Phase 4: Component Tests
**Status:** Not Started  
**Estimated Time:** 3-4 hours

### Priority Order:
1. [ ] `components/category-filter.tsx` - Filter selection logic
2. [ ] `components/sort-control.tsx` - Sort mode changes
3. [ ] `components/video-card.tsx` - Favorite toggling
4. [ ] `components/video-library.tsx` - Filtering, sorting, search (complex, test last)

### Test Files to Create:
- `tests/components/category-filter.test.tsx`
- `tests/components/sort-control.test.tsx`
- `tests/components/video-card.test.tsx`
- `tests/components/video-library.test.tsx`

---

## Phase 5: Integration & E2E Tests
**Status:** Not Started  
**Estimated Time:** 2-3 hours

### Integration Tests:
- [ ] API route: `/app/api/upload-profile-image/route.ts`
- [ ] Database operations with mock Supabase

### E2E Tests (Playwright):
- [ ] Student journey: Login → Browse → Filter → Add Favorite
- [ ] Admin journey: Login → Add Video → Assign Categories
- [ ] Teacher journey: Login → Update Student Belt → Verify My Level

### Test Files to Create:
- `tests/integration/api/upload-profile-image.test.ts`
- `tests/e2e/student-journey.spec.ts`
- `tests/e2e/admin-journey.spec.ts`

---

## Phase 6: CI/CD Integration
**Status:** Not Started  
**Estimated Time:** 1-2 hours

### Tasks:
- [ ] Create `sonar-project.properties`
- [ ] Add SonarQube scanner to package.json
- [ ] Configure Vercel build command to run tests + sonar
- [ ] Set up SonarQube environment variables in Vercel
- [ ] Test build pipeline
- [ ] Configure quality gate webhook (if possible)

### Files to Create:
- `sonar-project.properties`
- Update `vercel.json` or Vercel project settings

---

## Phase 7: Documentation & Code Quality Tools
**Status:** Not Started  
**Estimated Time:** 2 hours

### Tasks:
- [ ] Add JSDoc comments to public functions in `/lib/actions/*`
- [ ] Create/update README with testing instructions
- [ ] Install and configure Prettier
- [ ] Set up ESLint rules
- [ ] Install and configure Husky for pre-commit hooks
- [ ] Configure lint-staged
- [ ] Run `npx depcheck` and remove unused dependencies

### Files to Create/Update:
- `.prettierrc`
- `.prettierignore`
- `.eslintrc.json`
- `.husky/pre-commit`
- `README.md` updates

---

## Success Metrics
- [ ] All unit tests passing with >60% coverage
- [ ] Zero critical/blocker SonarQube issues
- [ ] Type safety score >90%
- [ ] Automated CI/CD running on every commit
- [ ] Pre-commit hooks preventing bad commits

---

## Notes & Blockers
- SonarQube initial analysis still in progress
- Will prioritize low-risk improvements first to avoid regressions
- User will test functionality after each phase
- Manual Vercel configuration needed for CI/CD setup

---

## Rollback Plan
If any phase introduces regressions:
1. Revert specific files causing issues
2. Document the problem
3. Skip to next phase
4. Return to problematic phase after investigation
