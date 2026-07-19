import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMedicalSpecialityApi } from '@/hooks/useApi';

interface PrimarySpecialityPickerProps {
  value: string;
  onChange: (specialityId: string) => void;
  disabled?: boolean;
}

// Optional single-select over the NMC qualification-ladder catalog (MD/MS broad
// specialities, DM/MCh super-specialities) — the doctor's ONE headline speciality (e.g.
// "DM - Cardiology"). Deliberately separate from QualificationSelector (free-text degree
// chips) and SpecializationSelector (hospital department sub-focus): this picker's only
// job is giving the public Doctor Dekho listing an authoritative category to show instead
// of guessing from the department name.
export const PrimarySpecialityPicker: React.FC<PrimarySpecialityPickerProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { data, isLoading, error } = useMedicalSpecialityApi.getAll();
  const items = data?.items ?? [];

  // MD/MS first (broad specialities), then DM/MCh (super-specialities) — matches the
  // qualification ladder's own order (MBBS -> MD/MS -> DM/MCh).
  const groups = useMemo(() => {
    const order: Record<string, number> = { MD: 0, MS: 1, DM: 2, MCh: 3 };
    const byCode = new Map<string, { name: string; items: typeof items }>();
    for (const item of items) {
      if (!byCode.has(item.qualificationTypeCode)) {
        byCode.set(item.qualificationTypeCode, { name: item.qualificationTypeName, items: [] });
      }
      byCode.get(item.qualificationTypeCode)!.items.push(item);
    }
    return [...byCode.entries()]
      .sort(([a], [b]) => (order[a] ?? 99) - (order[b] ?? 99))
      .map(([code, group]) => ({
        code,
        label: `${group.name} (${code})`,
        items: group.items.sort((a, b) => a.sortOrder - b.sortOrder),
      }));
  }, [items]);

  return (
    <div className="space-y-1">
      <Label htmlFor="primaryMedicalSpeciality" className="text-[11px] font-semibold text-slate-600">
        Primary Speciality (optional)
      </Label>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled || isLoading}>
        <SelectTrigger id="primaryMedicalSpeciality" className="mt-1">
          <SelectValue
            placeholder={
              isLoading ? 'Loading specialities…' : error ? 'Could not load specialities' : 'Not specified'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectGroup key={group.code}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.items.map((item) => (
                <SelectItem key={item.specialityId} value={item.specialityId}>
                  {item.patientFacingName ?? item.name}
                  {item.patientFacingName && item.patientFacingName !== item.name ? ` — ${item.name}` : ''}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-slate-400">
        Used to categorize this doctor on the public Doctor Dekho listing — separate from the department/specialization above.
      </p>
    </div>
  );
};
