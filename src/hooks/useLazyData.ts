import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

interface LazyDataOptions<T> {
  queryKey: string[];
  fetchFn: (page: number, limit: number) => Promise<{
    data: T[];
    total: number;
    hasMore: boolean;
  }>;
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
}

interface UseLazyDataReturn<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadMore: () => void;
  refetch: () => void;
  reset: () => void;
}

export function useLazyData<T>({
  queryKey,
  fetchFn,
  pageSize = 20,
  enabled = true,
  staleTime = 5 * 60 * 1000, // 5 minutes
  gcTime = 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  refetchOnWindowFocus = false
}: LazyDataOptions<T>): UseLazyDataReturn<T> {
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => fetchFn(pageParam as number, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    enabled: enabled && isInitialized,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const reset = useCallback(() => {
    queryClient.removeQueries({ queryKey });
    setIsInitialized(false);
  }, [queryClient, queryKey]);

  // Flatten all pages data
  const flattenedData = data?.pages.flatMap((page: any) => page.data) ?? [];

  return {
    data: flattenedData,
    isLoading,
    isError,
    error: error as Error | null,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    loadMore,
    refetch,
    reset
  };
}

// Simple lazy loading hook for single data fetch
interface UseLazyFetchOptions<T> {
  queryKey: string[];
  fetchFn: () => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

interface UseLazyFetchReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  reset: () => void;
}

export function useLazyFetch<T>({
  queryKey,
  fetchFn,
  enabled = false,
  staleTime = 5 * 60 * 1000,
  gcTime = 10 * 60 * 1000
}: UseLazyFetchOptions<T>): UseLazyFetchReturn<T> {
  const [shouldFetch, setShouldFetch] = useState(false);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: fetchFn,
    enabled: enabled && shouldFetch,
    staleTime,
    gcTime,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const triggerFetch = useCallback(() => {
    setShouldFetch(true);
  }, []);

  const reset = useCallback(() => {
    setShouldFetch(false);
    queryClient.removeQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    data: data as T,
    isLoading,
    isError,
    error: error as Error | null,
    refetch: triggerFetch,
    reset
  };
}
