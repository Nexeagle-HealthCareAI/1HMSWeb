import React, { useEffect, useState } from 'react';
import { create } from 'zustand';
import { RotateCcw } from 'lucide-react';
import { apiClient } from '@/services/axiosClient';
import { toast } from '@/hooks/use-toast';
import { useLogout } from '@/hooks/useLogout';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * "Reset my test account" in the user menu, Dev only (1HMSAPI docs/TESTER-ACCOUNTS.md).
 *
 * Shown only when the API says the signed-in user is a tester number on a Development server
 * (GET internal/tester-accounts/me; that route is 404 on production, so nothing shows there).
 * The reset works from the sign-in itself (POST internal/tester-accounts/reset-me): no key is in the browser.
 * It first shows a dry run, then deletes on confirm, signs out and goes back to sign-up.
 *
 * Two parts sharing a store: the menu item (inside the user dropdown) and the dialog (mounted outside it, so it
 * stays open after the dropdown closes).
 */
interface TesterStatus { available: boolean; isTester: boolean; maskedMobile?: string | null }
interface ResetResult {
  success: boolean;
  message?: string;
  hospitals: string[];
  users: number;
  tables: { table: string; rows: number }[];
  totalRows: number;
}

const ME = 'internal/tester-accounts/me';
const RESET_ME = 'internal/tester-accounts/reset-me';

// Not worth a request on the production site: the route does not exist there.
export const isProductionSite = (hostname: string) => hostname === '1hms.nexeagle.com';

const errorMessage = (e: any) => e?.response?.data?.message || e?.message || 'Something went wrong.';

interface TesterResetState {
  status: TesterStatus | null;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useTesterReset = create<TesterResetState>((set) => ({
  status: null,
  open: false,
  setOpen: (open) => set({ open }),
}));

let asked = false;

/** Asks the API once per page load whether the signed-in user is a Dev tester. */
export function loadTesterStatus(hostname: string = typeof window !== 'undefined' ? window.location.hostname : ''): Promise<void> {
  if (asked || !hostname || isProductionSite(hostname)) return Promise.resolve();
  asked = true;
  return apiClient.get<TesterStatus>(ME)
    .then((status) => useTesterReset.setState({ status }))
    .catch(() => { /* 404 (not a Dev server) or not signed in: nothing to show */ });
}

/** For tests. */
export function resetTesterStatus(): void {
  asked = false;
  useTesterReset.setState({ status: null, open: false });
}

const isShown = (s: TesterStatus | null) => !!s?.available && !!s.isTester;

/** The "Reset test account" entry for the user dropdown. Renders nothing unless the user is a Dev tester. */
export const TesterResetMenuItem: React.FC = () => {
  const status = useTesterReset((s) => s.status);
  const setOpen = useTesterReset((s) => s.setOpen);
  useEffect(() => { void loadTesterStatus(); }, []);
  if (!isShown(status)) return null;
  return (
    <>
      <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-600" />
      <DropdownMenuItem
        onSelect={() => setOpen(true)}
        className="text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 focus:bg-amber-50 dark:focus:bg-amber-500/10 cursor-pointer"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        <div className="flex flex-col">
          <span>Reset test account</span>
          <span className="text-[10px] text-gray-500">Dev only · {status!.maskedMobile}</span>
        </div>
      </DropdownMenuItem>
    </>
  );
};

/** The confirm dialog: dry run first, then reset, sign out and back to sign-up. Mount once, outside the dropdown. */
export const TesterResetDialog: React.FC = () => {
  const status = useTesterReset((s) => s.status);
  const open = useTesterReset((s) => s.open);
  const setOpen = useTesterReset((s) => s.setOpen);
  const [preview, setPreview] = useState<ResetResult | null>(null);
  const [busy, setBusy] = useState(false);
  const logout = useLogout();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setPreview(null);
    setBusy(true);
    apiClient.post<ResetResult>(RESET_ME, { dryRun: true })
      .then((r) => { if (alive) setPreview(r); })
      .catch((e) => {
        toast({ title: 'Could not check the test account', description: errorMessage(e), variant: 'destructive' });
        if (alive) setOpen(false);
      })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [open, setOpen]);

  if (!isShown(status)) return null;

  const reset = async () => {
    setBusy(true);
    try {
      const r = await apiClient.post<ResetResult>(RESET_ME, { dryRun: false });
      toast({ title: 'Test account reset', description: `${r.totalRows} rows deleted. The number is free to sign up again.` });
      resetTesterStatus();
      await logout({ redirectTo: '/login' });
    } catch (e) {
      toast({ title: 'Reset failed, nothing was changed', description: errorMessage(e), variant: 'destructive' });
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset this test account?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                Deletes the account for {status!.maskedMobile}, the hospitals it registered and everything in them,
                so the number can sign up again. Dev server only; this can't be undone.
              </p>
              {!preview ? (
                <p>Checking what would be deleted…</p>
              ) : (
                <ul className="list-disc pl-5" data-testid="tester-reset-preview">
                  <li>Hospitals: {preview.hospitals.length ? preview.hospitals.join(', ') : 'none'}</li>
                  <li>Accounts: {preview.users}</li>
                  <li>Rows in total: {preview.totalRows} across {preview.tables.length} tables</li>
                </ul>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || !preview}
            onClick={(e) => { e.preventDefault(); void reset(); }}
            className="bg-red-600 hover:bg-red-700"
          >
            {busy && preview ? 'Resetting…' : 'Reset and sign out'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
