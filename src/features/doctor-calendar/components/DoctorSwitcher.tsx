import React, { useState } from 'react';
import { Check, ChevronsUpDown, Stethoscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { HospitalDoctorItem } from '../api/doctorListApi';

interface DoctorSwitcherProps {
  doctors: HospitalDoctorItem[];
  selectedDoctorId?: string;
  onSelect: (doctor: HospitalDoctorItem) => void;
  isLoading?: boolean;
}

export const DoctorSwitcher: React.FC<DoctorSwitcherProps> = ({ doctors, selectedDoctorId, onSelect, isLoading }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = doctors.find(d => d.doctorId === selectedDoctorId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isLoading}
          className="w-full justify-between h-10 rounded-xl border-gray-200 dark:border-gray-700 font-semibold text-sm"
        >
          <span className="flex items-center gap-2 truncate">
            <Stethoscope className="h-4 w-4 shrink-0 text-poly-primary" />
            <span className="truncate">
              {isLoading
                ? t('doctorCalendar.switcher.loading', 'Loading doctors…')
                : selected?.fullName || t('doctorCalendar.switcher.placeholder', 'Select a doctor')}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 rounded-xl overflow-hidden shadow-2xl" align="start">
        <Command>
          <CommandInput placeholder={t('doctorCalendar.switcher.search', 'Search doctors…')} />
          <CommandList>
            <CommandEmpty>{t('doctorCalendar.switcher.empty', 'No doctors found.')}</CommandEmpty>
            <CommandGroup>
              {doctors.map((doctor) => (
                <CommandItem
                  key={doctor.doctorId}
                  value={`${doctor.fullName ?? ''} ${doctor.departmentName ?? ''}`}
                  onSelect={() => {
                    onSelect(doctor);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', doctor.doctorId === selectedDoctorId ? 'opacity-100' : 'opacity-0')}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{doctor.fullName || t('doctorCalendar.doctorFallback')}</span>
                    {doctor.departmentName && (
                      <span className="text-xs text-muted-foreground">{doctor.departmentName}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
