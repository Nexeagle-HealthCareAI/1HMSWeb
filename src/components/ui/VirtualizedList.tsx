import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  containerHeight?: number;
  overscan?: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingComponent?: React.ReactNode;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  className = '',
  containerHeight = 400,
  overscan = 5,
  onLoadMore,
  hasMore = false,
  loadingComponent
}: VirtualizedListProps<T>) {
  const [isLoading, setIsLoading] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length + (hasMore ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  const handleLoadMore = useCallback(async () => {
    if (onLoadMore && hasMore && !isLoading) {
      setIsLoading(true);
      try {
        await onLoadMore();
      } finally {
        setIsLoading(false);
      }
    }
  }, [onLoadMore, hasMore, isLoading]);

  // Auto-load more when user scrolls near the end
  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (
      lastItem.index >= items.length - 1 &&
      hasMore &&
      !isLoading
    ) {
      handleLoadMore();
    }
  }, [hasMore, items.length, isLoading, rowVirtualizer.getVirtualItems(), handleLoadMore]);

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index > items.length - 1;
          const item = items[virtualRow.index];

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {isLoaderRow ? (
                <div className="flex items-center justify-center p-4">
                  {loadingComponent || (
                    <div className="text-center text-muted-foreground">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm">Loading more...</p>
                    </div>
                  )}
                </div>
              ) : (
                renderItem(item, virtualRow.index)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
