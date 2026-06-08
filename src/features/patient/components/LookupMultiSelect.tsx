import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type LookupSource = 'personal' | 'general';

export type LookupItem = {
  id: string; // e.g., "P:1021" or "G:77"
  name: string;
  code?: string | null;
  shortDesc?: string | null;
  usageCount?: number | null;
  source: LookupSource;
};

export type LookupSearchResponse = {
  query: string;
  personal: LookupItem[];
  general: LookupItem[];
};

export type LookupSearchParams = {
  hospitalId: string;
  doctorId: string;
  section: string;
  q: string;
  limit?: number;
  includePopularWhenEmpty?: boolean;
};

export type LookupFetcher = (params: LookupSearchParams, signal?: AbortSignal) => Promise<LookupSearchResponse>;

const useDebouncedValue = <T,>(value: T, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export type LookupMultiSelectProps = {
  hospitalId: string;
  doctorId: string;
  section: string;
  value: LookupItem[];
  onChange: (items: LookupItem[]) => void;
  fetcher: LookupFetcher;
  limit?: number;
  minChars?: number;
  debounceMs?: number;
  includePopularWhenEmpty?: boolean;
  placeholder?: string;
  allowFreeText?: boolean;
  onItemSelected?: (item: LookupItem) => void;
  quickPicks?: LookupItem[];
  onSave?: (items: LookupItem[]) => void;
  saveLabel?: string;
};

export const LookupMultiSelect: React.FC<LookupMultiSelectProps> = ({
  hospitalId,
  doctorId,
  section,
  value,
  onChange,
  fetcher,
  limit = 10,
  minChars = 2,
  debounceMs = 250,
  includePopularWhenEmpty = true,
  placeholder = 'Type to search...',
  allowFreeText = true,
  onItemSelected,
  quickPicks = [],
  onSave,
  saveLabel = 'Save',
}) => {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, debounceMs);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [data, setData] = useState<LookupSearchResponse>({ query: '', personal: [], general: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const personal = data.personal ?? [];
  const general = data.general ?? [];
  const combined = useMemo(() => [...personal, ...general], [personal, general]);
  const personalQuickPicks = useMemo(
    () => (quickPicks || []).filter((item) => item.source === 'personal'),
    [quickPicks]
  );

  // Close on outside click
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  // Fetch results (debounced + abortable)
  useEffect(() => {
    const query = (debouncedQ || '').trim();

    if (query.length === 0 && !includePopularWhenEmpty) {
      setData({ query, personal: [], general: [] });
      setError(null);
      setLoading(false);
      return;
    }
    if (query.length > 0 && query.length < minChars) {
      setData({ query, personal: [], general: [] });
      setError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    fetcher({ hospitalId, doctorId, section, q: query, limit, includePopularWhenEmpty }, ac.signal)
      .then((resp) => {
        setData(resp);
        setLoading(false);
        setActiveIndex(-1);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setError(e?.message ?? 'Search failed');
        setLoading(false);
      });

    return () => ac.abort();
  }, [debouncedQ, doctorId, fetcher, hospitalId, includePopularWhenEmpty, limit, minChars, section]);

  const addItem = (item: LookupItem) => {
    if (value.some((x) => x.id === item.id)) return;
    onChange([...value, item]);
    onItemSelected?.(item);
    setQ('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeItem = (id: string) => onChange(value.filter((x) => x.id !== id));

  const addFreeText = () => {
    const text = q.trim();
    if (!text) return;
    const item: LookupItem = {
      id: `T:${text}`,
      name: text,
      source: 'personal',
    };
    addItem(item);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && q.length === 0 && value.length > 0) {
      removeItem(value[value.length - 1].id);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => {
        const max = Math.max(0, combined.length - 1);
        if (i === -1) return 0;
        return i >= max ? 0 : i + 1; // Cycle to top
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => {
        const max = Math.max(0, combined.length - 1);
        if (i <= 0) return max; // Cycle to bottom (or -1 if we wanted to Deselect)
        return i - 1;
      });
    } else if (e.key === 'ArrowRight') {
      // Jump to start of General section ONLY if already navigating
      if (activeIndex !== -1 && personal.length > 0 && general.length > 0) {
        e.preventDefault();
        setActiveIndex(personal.length);
      }
    } else if (e.key === 'ArrowLeft') {
      // Jump to start of Personal section ONLY if already navigating
      if (activeIndex !== -1 && personal.length > 0) {
        e.preventDefault();
        setActiveIndex(0);
      }
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && combined[activeIndex]) {
        e.preventDefault();
        addItem(combined[activeIndex]);
      } else if (allowFreeText) {
        // If nothing explicitly selected, treat as free text submission
        e.preventDefault();
        addFreeText();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const renderRow = (item: LookupItem, isActive: boolean) => (
    <div
      className={cn(
        'rounded-lg px-3 py-2 cursor-pointer border',
        isActive ? 'border-brand-500 bg-brand-50' : 'border-transparent hover:bg-gray-50'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-800">{item.name}</div>
        {typeof item.usageCount === 'number' && (
          <div className="text-xs text-gray-500">{item.usageCount}</div>
        )}
      </div>
      {(item.shortDesc || item.code) && (
        <div className="text-xs text-gray-600">
          {item.code ? `${item.code} · ` : ''}
          {item.shortDesc ?? ''}
        </div>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="w-full space-y-2">
      <div
        className="border border-gray-200 rounded-xl px-3 py-2 flex flex-wrap gap-2 items-center"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((it) => (
          <div
            key={it.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700"
          >
            <span>{it.name}</span>
            <button
              type="button"
              className="text-gray-500 hover:text-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                removeItem(it.id);
              }}
              aria-label={`Remove ${it.name}`}
            >
              ×
            </button>
          </div>
        ))}

        <Input
          ref={inputRef}
          value={q}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActiveIndex(-1); // Reset selection on typing
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="flex-1 border-none shadow-none focus-visible:ring-0 px-0 text-sm"
        />
      </div>

      {(personalQuickPicks.length > 0 || onSave) && (
        <div className="flex items-center justify-between">
          {personalQuickPicks.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-gray-600 uppercase">Quick picks (personal)</div>
              <div className="flex flex-wrap gap-2">
                {personalQuickPicks.map((item) => (
                  <Button
                    key={item.id}
                    variant={value.some((x) => x.id === item.id) ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto min-h-8 text-xs rounded-full px-3 py-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addItem(item);
                    }}
                  >
                    {item.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {onSave && (
            <Button size="sm" className="h-8 px-3" onClick={() => onSave(value)}>
              {saveLabel}
            </Button>
          )}
        </div>
      )}

      {open && (
        <div className="border border-gray-200 rounded-xl bg-white shadow-xl p-3 space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div>{loading ? 'Searching...' : error ? error : ' '}</div>
            {allowFreeText && q.trim().length > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addFreeText}>
                Add "{q.trim()}"
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-gray-600 uppercase">Personal</div>
              <div className="flex flex-col gap-1 max-h-64 overflow-auto">
                {personal.length === 0 && !loading ? (
                  <div className="text-xs text-gray-500 px-2 py-1.5">No personal items</div>
                ) : (
                  personal.map((it, idx) => {
                    const isActive = activeIndex === idx;
                    return (
                      <div
                        key={it.id}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addItem(it);
                        }}
                      >
                        {renderRow(it, isActive)}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-gray-600 uppercase">General</div>
              <div className="flex flex-col gap-1 max-h-64 overflow-auto">
                {general.length === 0 && !loading ? (
                  <div className="text-xs text-gray-500 px-2 py-1.5">No general items</div>
                ) : (
                  general.map((it, idx) => {
                    const globalIdx = personal.length + idx;
                    const isActive = activeIndex === globalIdx;
                    return (
                      <div
                        key={it.id}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addItem(it);
                        }}
                      >
                        {renderRow(it, isActive)}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-gray-500">Tips: arrow keys navigate, Enter selects, Backspace removes last chip.</div>
        </div>
      )}
    </div>
  );
};
