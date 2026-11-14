import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { VITA_API_URL } from '../config';
import { useVitaUi } from '../store';

const LABEL = { en: 'Ask Vita', hi: 'Vita से पूछें' } as const;

const readLocale = (): 'en' | 'hi' => {
  try {
    return localStorage.getItem('vita.locale') === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
};

/** "Ask Vita" in the top nav: opens and closes the Vita side drawer (same as Ctrl+K). */
export const VitaNavButton: React.FC<{ className?: string }> = ({ className }) => {
  const open = useVitaUi((s) => s.open);
  const toggle = useVitaUi((s) => s.toggle);
  const token = useAuthStore((s) => s.token);
  if (!VITA_API_URL || !token) return null;
  const label = LABEL[readLocale()];

  return (
    <button
      type="button"
      data-vita-ui="nav-button"
      onClick={toggle}
      aria-label={label}
      aria-expanded={open}
      aria-controls="vita-drawer"
      title={`${label} (Ctrl+K)`}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full px-2.5 sm:px-3 text-sm font-semibold transition',
        open
          ? 'bg-brand-700 text-white shadow-inner'
          : 'bg-brand-600 text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700 active:scale-95',
        className,
      )}
    >
      <Sparkles className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
      <kbd className="hidden xl:inline rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
    </button>
  );
};

export default VitaNavButton;
