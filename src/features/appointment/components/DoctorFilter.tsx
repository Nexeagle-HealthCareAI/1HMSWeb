import React, { useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

export interface DoctorOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: DoctorOption[];
  /** Today's availability per doctor id (true = available); shows a green or red dot. */
  availability?: Map<string, boolean>;
  allLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  className?: string;
}

const SEP = '__';

/**
 * Doctor filter for the appointment board: a searchable list, A to Z, with "All doctors" always on top.
 * Stays usable with 20 or more doctors, where a plain dropdown becomes a long list to scroll.
 */
export function DoctorFilter({ value, onChange, options, availability, allLabel, searchPlaceholder, emptyLabel, className }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const sorted = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    [options],
  );
  const selectedLabel = value === 'all' ? allLabel : (options.find((o) => o.value === value)?.label ?? allLabel);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
    setSearch('');
  };

  // Hide the pinned "All doctors" row while a search matches no doctor, so only the empty message shows.
  const term = search.trim().toLowerCase();
  const showAll = !term || sorted.some((d) => d.label.toLowerCase().includes(term));
  const selectedCls = 'bg-[#e6f4ea] text-[#137333] dark:bg-green-900/30 dark:text-green-300';

  // Closing the list after a search that matched nobody resets the filter to "All doctors".
  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      if (term && !showAll) onChange('all');
      setSearch('');
    }
  };

  const dot = (id: string) => availability?.has(id) && (
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${availability.get(id) ? 'bg-[#188038]' : 'bg-[#d93025]'}`} />
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn('flex items-center justify-between gap-2 border px-3 py-2 text-sm text-left focus:outline-none', className)}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[9999] w-[var(--radix-popover-trigger-width)] min-w-[14rem] p-0 rounded-xl overflow-hidden"
      >
        {/* Match on the doctor's name only (the id after SEP is there to keep rows unique). */}
        <Command
          filter={(itemValue, search) => (itemValue.split(SEP)[0].toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0)}
        >
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} autoFocus />
          <CommandList className="max-h-[260px]">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {showAll && (
                <CommandItem
                  value={`${allLabel}${SEP}all`}
                  forceMount
                  onSelect={() => pick('all')}
                  className={cn('cursor-pointer font-medium justify-between', value === 'all' && selectedCls)}
                >
                  {allLabel}
                  {value === 'all' && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </CommandItem>
              )}
              {sorted.map((doctor) => (
                <CommandItem
                  key={doctor.value}
                  value={`${doctor.label}${SEP}${doctor.value}`}
                  onSelect={() => pick(doctor.value)}
                  className={cn('cursor-pointer font-medium justify-between', value === doctor.value && selectedCls)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {dot(doctor.value)}
                    {doctor.label}
                  </span>
                  {value === doctor.value && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
