import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Check, GitBranch } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { cn } from '@/lib/utils';

/**
 * Header hospital control, shown right next to the 1HMS logo. Always displays the active hospital
 * name. For users in 2+ hospitals it becomes a switcher; for Admin/AdminDoctor it also exposes
 * "Manage hospital chain" (→ /chain). Switching reloads to home so every screen + the offline cache
 * re-scope to the newly active hospital.
 */
export const HospitalSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const hospitals = useAuthStore(s => s.hospitals);
  const activeId = useAuthStore(s => s.hospitalId);
  const switchHospital = useAuthStore(s => s.switchHospital);
  const userRole = useAuthStore(s => s.userRole);

  // Self-heal: if the list isn't loaded yet but a hospital is active (e.g. an existing session
  // from before the switcher existed), fetch it so the hospital name shows by default.
  useEffect(() => {
    if ((!hospitals || hospitals.length === 0) && activeId) {
      hospitalApi.getMyHospitals()
        .then(mine => { if (mine.length) useAuthStore.getState().setHospitals(mine); })
        .catch(() => { /* non-blocking */ });
    }
  }, [hospitals, activeId]);

  const active = (hospitals ?? []).find(h => h.hospitalId === activeId) ?? (hospitals ?? [])[0];
  if (!active) return null; // not resolved yet / onboarding

  const isMulti = (hospitals ?? []).length >= 2;
  const canManageChain = userRole === 'Admin' || userRole === 'AdminDoctor';
  const interactive = isMulti || canManageChain;

  const onSelect = (id: string) => {
    if (id === activeId) return;
    switchHospital(id);
    window.location.href = '/'; // re-bootstrap queries + offline cache for the new hospital
  };

  // Non-interactive (single hospital, non-admin): a plain name label next to the logo.
  if (!interactive) {
    return (
      <div className="hidden md:flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 h-10 text-base font-bold text-gray-800 dark:text-gray-100">
        <Building2 className="h-4 w-4 text-brand-600 shrink-0" />
        <span className="max-w-[180px] truncate">{active.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hidden md:inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 h-10 text-base font-bold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
          title="Hospital"
        >
          <Building2 className="h-4 w-4 text-brand-600 shrink-0" />
          <span className="max-w-[180px] truncate">{active.name}</span>
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {isMulti && (
          <>
            <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">Switch hospital</p>
            <DropdownMenuSeparator />
            {hospitals.map(h => (
              <DropdownMenuItem key={h.hospitalId} onClick={() => onSelect(h.hospitalId)} className="flex items-center gap-2.5 py-2 cursor-pointer">
                <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{h.name}</p>
                  {(h.city || h.chainName) && (
                    <p className="text-[11px] text-gray-400 truncate">{[h.city, h.chainName].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                <Check className={cn('h-4 w-4 text-brand-600 shrink-0', h.hospitalId === activeId ? 'opacity-100' : 'opacity-0')} />
              </DropdownMenuItem>
            ))}
          </>
        )}
        {canManageChain && (
          <>
            {isMulti && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => navigate('/chain')} className="flex items-center gap-2.5 py-2 cursor-pointer">
              <GitBranch className="h-4 w-4 text-brand-600 shrink-0" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Manage hospital chain</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
