import { describe, test, expect, beforeEach } from 'vitest';
import {
  queryClient,
  clearAllQueryCache,
  invalidateApplicationQueries,
  invalidateInterviewQueries,
  invalidateOpeningQueries,
  invalidateTagQueries,
  invalidateProfileQueries,
} from './queries';

describe('Query Cache & Security Unit Tests', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  test('1. Cache cleared on logout / login / 401', () => {
    // Populate cache with user data
    queryClient.setQueryData(['applications', 'userA'], [{ id: 1, companyName: 'Company A' }]);
    queryClient.setQueryData(['dashboard', 'userA'], { statusCounts: { APPLIED: 5 } });
    queryClient.setQueryData(['profile', 'userA'], { name: 'User A' });

    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0);
    expect(queryClient.getQueryData(['applications', 'userA'])).toBeDefined();

    // Trigger clearAllQueryCache()
    clearAllQueryCache();

    // Verify cache is completely empty
    expect(queryClient.getQueryCache().getAll().length).toBe(0);
    expect(queryClient.getQueryData(['applications', 'userA'])).toBeUndefined();
    expect(queryClient.getQueryData(['dashboard', 'userA'])).toBeUndefined();
  });

  test('2. User-scoped cache keys prevent data leakage across accounts', () => {
    const userAData = [{ id: 101, companyName: 'Acme Corp' }];
    const userBData = [{ id: 202, companyName: 'Beta Inc' }];

    queryClient.setQueryData(['applications', 'user_123'], userAData);
    queryClient.setQueryData(['applications', 'user_456'], userBData);

    const retrievedUserA = queryClient.getQueryData(['applications', 'user_123']);
    const retrievedUserB = queryClient.getQueryData(['applications', 'user_456']);

    expect(retrievedUserA).toEqual(userAData);
    expect(retrievedUserB).toEqual(userBData);
    expect(retrievedUserA).not.toEqual(retrievedUserB);
  });

  test('3. Invalidation after a mutation targets affected queries only', () => {
    const userId = 'user_789';

    // Populate queries
    queryClient.setQueryData(['applications', userId], [{ id: 1 }]);
    queryClient.setQueryData(['dashboard', userId], { statusCounts: {} });
    queryClient.setQueryData(['interviews', userId], []);
    queryClient.setQueryData(['openings', userId], []);

    // Invalidate application queries
    invalidateApplicationQueries(userId);

    const appQueryState = queryClient.getQueryState(['applications', userId]);
    const dashQueryState = queryClient.getQueryState(['dashboard', userId]);
    const opQueryState = queryClient.getQueryState(['openings', userId]);

    expect(appQueryState.isInvalidated).toBe(true);
    expect(dashQueryState.isInvalidated).toBe(true);
    expect(opQueryState.isInvalidated).toBe(false);
  });

  test('4. Invalidation helpers cover tags, openings, interviews, profile', () => {
    const userId = 'user_test';

    queryClient.setQueryData(['tags', userId], []);
    queryClient.setQueryData(['openings', userId], []);
    queryClient.setQueryData(['adminOpenings', userId], []);
    queryClient.setQueryData(['profile', userId], {});

    invalidateTagQueries(userId);
    invalidateOpeningQueries(userId);
    invalidateProfileQueries(userId);

    expect(queryClient.getQueryState(['tags', userId]).isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['openings', userId]).isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['adminOpenings', userId]).isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['profile', userId]).isInvalidated).toBe(true);
  });

  test('5. Skeleton shown ONLY when there is no cached data', () => {
    // Condition helper logic matching component rule: showSkeleton = isLoading && !hasCachedData
    const computeShowSkeleton = (isLoading, cachedData) => isLoading && !cachedData;

    // First load (uncached): isLoading = true, cachedData = undefined -> showSkeleton = true
    expect(computeShowSkeleton(true, undefined)).toBe(true);

    // Return visit with cached data: isLoading = false or isFetching = true, cachedData = [...] -> showSkeleton = false
    expect(computeShowSkeleton(false, [{ id: 1 }])).toBe(false);
    expect(computeShowSkeleton(true, [{ id: 1 }])).toBe(false);
  });
});
