# VideoLibrary Refactoring Plan

## Overview
Refactoring the `video-library.tsx` component (1,247 lines) into smaller, testable, reusable pieces.

**Started**: March 2026  
**Status**: Planning Complete - Awaiting Approval

---

## Current Architecture

### Files Involved
| File | Lines | Purpose |
|------|-------|---------|
| `components/video-library.tsx` | 1,247 | Main component - too large |
| `components/mobile-filter-dialog.tsx` | ~200 | Mobile filter UI (has duplicated components) |
| `components/category-filter.tsx` | ~150 | Category checkbox filter |
| `components/curriculum-filter.tsx` | ~150 | Curriculum checkbox filter |
| `components/sort-control.tsx` | ~80 | Sort dropdown |
| `components/view-toggle.tsx` | ~60 | Grid/List toggle |
| `components/video-card.tsx` | ~200 | Individual video card |
| `components/video-card-list.tsx` | ~100 | List view item |
| `lib/video-sorting.ts` | ~150 | Sort utilities (already extracted) |

### Current Issues
1. **File too large**: 1,247 lines with 24+ internal components
2. **Duplication**: `FilterModeToggle` and `FilterSection` exist in both video-library.tsx and mobile-filter-dialog.tsx
3. **Mixed concerns**: Data fetching, state management, UI, and business logic intertwined
4. **20+ useState hooks**: Makes testing and reasoning difficult
5. **Types scattered**: Interface definitions duplicated across files

---

## Refactoring Phases

### Phase 1: Extract Shared Components & Types
**Status**: IN PROGRESS

#### 1.1 Create shared types file
- [x] Create `/types/video.ts`
- [x] Move: `Video`, `Category`, `Curriculum`, `Performer`, `FilterMode` interfaces
- [x] Update imports in all consuming files

#### 1.2 Extract FilterModeToggle
- [x] Create `/components/filter-mode-toggle.tsx`
- [x] Remove from `video-library.tsx`
- [x] Remove from `mobile-filter-dialog.tsx`
- [x] Update imports

#### 1.3 Extract FilterSection
- [x] Create `/components/filter-section.tsx`
- [x] Remove duplicates
- [x] Update imports

#### 1.4 Extract PaginationControls
- [x] Create `/components/pagination-controls.tsx`
- [x] Remove from `video-library.tsx`
- [x] Update imports

#### 1.5 Extract SearchInput
- [x] Create `/components/search-input.tsx`
- [x] Remove from `video-library.tsx`
- [x] Update imports

#### 1.6 Extract TrainingBanner
- [x] Create `/components/training-banner.tsx`
- [x] Includes both mobile and desktop variants
- [x] Remove from `video-library.tsx`
- [x] Update imports

#### 1.7 Run tests and verify
- [ ] All existing tests pass
- [ ] Manual verification on desktop
- [ ] Manual verification on mobile

**Progress Notes (Phase 1)**:
- video-library.tsx reduced from 1,247 to ~802 lines (36% reduction)
- Updated test mocks for new component structure
- SearchInput props renamed: `searchQuery`→`value`, `onSearchChange`→`onChange`
- PaginationControls props renamed: `handleItemsPerPageChange`→`onItemsPerPageChange`, `handlePageChange`→`onPageChange`

---

### Phase 2: Extract State Management Hooks
**Status**: Not Started

#### 2.1 Create useVideoFilters hook
- [ ] Create `/hooks/use-video-filters.ts`
- [ ] Move: filter state, URL sync, filter mode
- [ ] Include: selectedCategories, selectedCurriculums, searchQuery, filterMode
- [ ] Handle URL parameter synchronization

#### 2.2 Create useVideoPagination hook
- [ ] Create `/hooks/use-video-pagination.ts`
- [ ] Move: currentPage, itemsPerPage, pageCount calculation
- [ ] Handle localStorage persistence for itemsPerPage

#### 2.3 Create useVideoSort hook
- [ ] Create `/hooks/use-video-sort.ts`
- [ ] Move: sortOption state
- [ ] Handle localStorage persistence

#### 2.4 Create useLocalStorageState utility hook
- [ ] Create `/hooks/use-local-storage-state.ts`
- [ ] Generic hook for localStorage-backed state
- [ ] Used by pagination and sort hooks

#### 2.5 Update video-library.tsx
- [ ] Replace inline state with custom hooks
- [ ] Verify all functionality preserved

#### 2.6 Run tests and verify
- [ ] All existing tests pass
- [ ] Add unit tests for new hooks
- [ ] Manual verification

---

### Phase 3: Extract Data Layer
**Status**: Not Started

#### 3.1 Extract video data fetcher
- [ ] Create `/lib/video-data-fetcher.ts`
- [ ] Move: circuit breaker logic, caching logic
- [ ] Move: `loadAllData` function equivalent

#### 3.2 Create useVideoData hook
- [ ] Create `/hooks/use-video-data.ts`
- [ ] SWR-based data fetching
- [ ] Handles: videos, categories, curriculums, performers, favorites
- [ ] Includes error handling and loading states

#### 3.3 Update video-library.tsx
- [ ] Replace data fetching with hook
- [ ] Simplify component

#### 3.4 Run tests and verify
- [ ] All existing tests pass
- [ ] Add unit tests for data fetcher
- [ ] Manual verification

---

### Phase 4: Final Cleanup
**Status**: Not Started

#### 4.1 Review video-library.tsx
- [ ] Should be primarily composition of extracted pieces
- [ ] Target: under 400 lines
- [ ] Clean, readable render logic

#### 4.2 Update tests
- [ ] Review test coverage
- [ ] Add any missing tests for extracted components
- [ ] Update test documentation

#### 4.3 Documentation
- [ ] Update this file with final state
- [ ] Note any breaking changes (should be none)

---

## Test Files to Monitor
- `tests/components/video-library.test.tsx` (1,121 lines)
- `tests/components/video-library-helpers.test.ts`
- `tests/components/category-filter.test.tsx`
- `tests/components/curriculum-filter.test.tsx`
- `tests/components/mobile-filter-dialog.test.tsx`
- `tests/components/sort-control.test.tsx`
- `tests/components/view-toggle.test.tsx`
- `tests/components/video-card.test.tsx`
- `tests/components/video-card-list.test.tsx`

---

## Decisions & Notes

### Why this order?
1. **Phase 1 first**: Extracting components is lowest risk, highest immediate value
2. **Phase 2 second**: Hooks can be extracted without changing component structure
3. **Phase 3 third**: Data layer requires hooks to be in place
4. **Phase 4 last**: Cleanup after all extractions complete

### Principles
- No user-facing changes
- All existing tests must pass (with minimal modification)
- Each phase independently testable
- Prefer composition over inheritance

---

## Completion Checklist
- [ ] Phase 1 complete
- [ ] Phase 2 complete
- [ ] Phase 3 complete
- [ ] Phase 4 complete
- [ ] All tests passing
- [ ] Manual testing complete
- [ ] Production deployed
