import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Kind = 'block' | 'city';

export interface BlockPick {
  block: string;
  district: string;
  state: string;
  /** City to fill: the district name without any bracketed part. */
  city: string;
}

interface Props {
  id: string;
  kind: Kind;
  value: string;
  onChange: (value: string) => void;
  onPickBlock?: (pick: BlockPick) => void;
  onPickCity?: (city: string, state: string) => void;
  placeholder?: string;
  className?: string;
  'aria-invalid'?: boolean;
}

interface Row { name: string; key: string; state: string; district?: string }
interface Flat { blocks: Row[]; cities: Row[] }

const MIN_CHARS = 2;
const MAX_ROWS = 8;

// The lists are about 150 KB, so they load the first time a box is used, not with the page.
let cache: Promise<Flat> | null = null;
function loadData(): Promise<Flat> {
  if (!cache) {
    cache = import('../data/indianLocations').then(({ BLOCKS, CITIES }) => {
      const blocks: Row[] = [];
      BLOCKS.forEach(([state, districts]) =>
        districts.forEach(([district, names]) =>
          names.forEach((name) => blocks.push({ name, key: name.toLowerCase(), state, district }))));
      const cities: Row[] = [];
      CITIES.forEach(([state, names]) => names.forEach((name) => cities.push({ name, key: name.toLowerCase(), state })));
      return { blocks, cities };
    });
  }
  return cache;
}

// Number of single-letter changes (add, remove, swap) between two short words.
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > limit) return limit + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How far a typed text is from the start of a name, tolerating a spelling slip. Large number = no match. */
function fuzzyScore(q: string, key: string): number {
  const limit = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0;
  if (limit === 0) return 99;
  let best = 99;
  for (let len = q.length - 1; len <= q.length + 1; len++) {
    if (len < 2 || len > key.length) continue;
    const d = editDistance(q, key.slice(0, len), limit);
    if (d <= limit && d < best) best = d;
  }
  return best;
}

const withoutBrackets = (s: string) => s.replace(/\s*\(.*?\)/g, '').trim();

/**
 * Text box that suggests Indian blocks or cities once 2 letters are typed.
 * Rows come in list order (Bihar first, then nearby states), best matches (starts with) before the rest.
 * Anything can still be typed freely.
 */
export function LocationTypeahead({ id, kind, value, onChange, onPickBlock, onPickCity, placeholder, className, ...rest }: Props) {
  const [data, setData] = useState<Flat | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = `${id}-suggestions`;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const q = value.trim().toLowerCase();
  const rows = useMemo(() => {
    if (!data || q.length < MIN_CHARS) return [];
    const src = kind === 'block' ? data.blocks : data.cities;
    const starts: Row[] = [];
    const has: Row[] = [];
    for (const r of src) {
      if (r.key.startsWith(q)) starts.push(r);
      else if (r.key.includes(q)) has.push(r);
      if (starts.length >= MAX_ROWS) break;
    }
    const found = [...starts, ...has];
    if (found.length >= MAX_ROWS) return found.slice(0, MAX_ROWS);
    // Spelling slips ("Purnea" for Purnia, "Kishangnj"): closest names, in list order for equal closeness.
    const near: { r: Row; d: number }[] = [];
    for (const r of src) {
      if (r.key.startsWith(q) || r.key.includes(q)) continue;
      const d = fuzzyScore(q, r.key);
      if (d < 99) near.push({ r, d });
    }
    near.sort((a, b) => a.d - b.d);
    return [...found, ...near.map((n) => n.r)].slice(0, MAX_ROWS);
  }, [data, q, kind]);

  // Typed text that is not an official name stays allowed, but is marked.
  const notInList = useMemo(() => {
    if (!data || q.length < 3) return false;
    const src = kind === 'block' ? data.blocks : data.cities;
    return !src.some((r) => r.key === q);
  }, [data, q, kind]);

  useEffect(() => { if (value && !data) loadData().then((d) => { if (alive.current) setData(d); }); }, [value, data]);

  const ensureData = () => { if (!data) loadData().then((d) => { if (alive.current) setData(d); }); };

  const pick = (r: Row) => {
    if (kind === 'block') {
      onPickBlock?.({ block: r.name, district: r.district || '', state: r.state, city: withoutBrackets(r.district || '') });
      onChange(r.name);
    } else {
      onPickCity?.(r.name, r.state);
      onChange(r.name);
    }
    setOpen(false);
    setActive(-1);
  };

  const showList = open && rows.length > 0;

  // The pop-up closes on Escape before this box sees the key, so while the list is open
  // catch Escape first (capture phase on window) and close only the list.
  useEffect(() => {
    if (!showList) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      setOpen(false);
      setActive(-1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [showList]);

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        placeholder={placeholder}
        className={className}
        aria-invalid={rest['aria-invalid']}
        onFocus={() => { ensureData(); setOpen(true); }}
        onChange={(e) => { ensureData(); onChange(e.target.value); setOpen(true); setActive(-1); }}
        onBlur={() => { setOpen(false); setActive(-1); }}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % rows.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? rows.length - 1 : a - 1)); }
          else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(rows[active]); }
        }}
      />
      {notInList && !showList && (
        <p className="mt-1 text-xs text-muted-foreground">
          {kind === 'block' ? 'Not in the block list. Saved as typed.' : 'Not in the city list. Saved as typed.'}
        </p>
      )}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-64 w-max min-w-full max-w-[min(22rem,80vw)] overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {rows.map((r, i) => (
            <li
              key={`${r.state}-${r.district || ''}-${r.name}-${i}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(r); }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${i === active ? 'bg-brand-50 dark:bg-white/10' : ''}`}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="font-semibold whitespace-nowrap">{r.name}</span>
              <span className="ml-auto shrink-0 whitespace-nowrap pl-3 text-xs text-muted-foreground">
                {kind === 'block' ? `${withoutBrackets(r.district || '')}, ${r.state}` : r.state}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
