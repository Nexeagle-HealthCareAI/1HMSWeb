import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, UserPlus, Link2, Loader2, FileBadge2, Pencil, HelpCircle, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store';
import { abdmApi, type AbhaAccountSummary } from '../services/abdmApi';
import { CreateAbhaWizard } from './CreateAbhaWizard';
import { LinkExistingAbhaWizard } from './LinkExistingAbhaWizard';
import { EditAbhaProfileWizard } from './EditAbhaProfileWizard';
import { AbdmGuidePanel } from './AbdmGuidePanel';
import { ReactivateAbhaDialog } from './ReactivateAbhaDialog';
import { CounterScanPanel } from './CounterScanPanel';
import { RecordLinkingPanel } from './RecordLinkingPanel';
import { canUseAbdm } from '../hooks/useAbdmCareContexts';
import { filterAbhaAccounts } from '../utils/filterAbhaAccounts';

type BoardTab = 'counter' | 'accounts' | 'records' | 'setup' | 'log';
const TAB_KEY = 'abdm-board-tab';
const TABS: BoardTab[] = ['counter', 'accounts', 'records', 'setup', 'log'];

export const AbdmDashboard: React.FC = () => {
  const { toast } = useToast();
  const hospitalId = useAuthStore(s => s.hospitalId) || '';
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<AbhaAccountSummary | null>(null);
  const [removeAccount, setRemoveAccount] = useState<AbhaAccountSummary | null>(null);
  const [removing, setRemoving] = useState(false);
  const [accounts, setAccounts] = useState<AbhaAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [waiting, setWaiting] = useState(0);
  const [tab, setTab] = useState<BoardTab>(() => {
    try {
      const saved = sessionStorage.getItem(TAB_KEY) as BoardTab | null;
      return saved && TABS.includes(saved) ? saved : 'counter';
    } catch { return 'counter'; }
  });
  const changeTab = (v: string) => {
    setTab(v as BoardTab);
    try { sessionStorage.setItem(TAB_KEY, v); } catch { /* storage unavailable: non-fatal */ }
  };

  // Same query the record-sharing panel uses, so this adds no extra request.
  const readiness = useQuery({
    queryKey: ['abdm', 'm2-readiness', hospitalId],
    queryFn: () => abdmApi.getM2Readiness(hospitalId),
    enabled: !!hospitalId && canUseAbdm(),
    staleTime: 30_000,
  });
  const setupIssues = readiness.data?.issues ?? [];
  const shownAccounts = filterAbhaAccounts(accounts, search);

  const load = async () => {
    if (!hospitalId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await abdmApi.getAccounts(hospitalId);
      setAccounts(res.accounts || []);
    } catch {
      toast({ title: 'Could not load ABHA accounts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [hospitalId]);

  const confirmRemove = async () => {
    if (!removeAccount) return;
    setRemoving(true);
    try {
      const res = await abdmApi.removeAccount(hospitalId, removeAccount.abhaAccountId);
      if (!res.success) { toast({ title: 'Could not remove', description: res.message, variant: 'destructive' }); return; }
      toast({ title: 'Removed from hospital records' });
      setRemoveAccount(null);
      void load();
    } catch (e: any) {
      toast({ title: 'Could not remove', description: e?.response?.data?.Message || e?.message, variant: 'destructive' });
    } finally {
      setRemoving(false);
    }
  };

  const onWizardDone = () => {
    void load();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <FileBadge2 className="h-6 w-6" aria-hidden="true" />
            </div>
            ABHA / ABDM
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Patients' ABHA accounts, counter scans and record sharing for this hospital.
          </p>
        </div>
        <Button variant="outline" className="gap-2 bg-white dark:bg-zinc-950" onClick={() => setGuideOpen(true)}>
          <HelpCircle className="h-4 w-4" aria-hidden="true" /> Staff guide
        </Button>
      </div>

      {setupIssues.length > 0 && tab !== 'setup' && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" aria-hidden="true" />
          <p className="flex-1 min-w-0 text-sm text-amber-900 dark:text-amber-200">
            <strong>Setup needs attention.</strong> {setupIssues[0].text}
            {setupIssues.length > 1 ? ` (and ${setupIssues.length - 1} more)` : ''}
          </p>
          <Button variant="outline" size="sm" className="border-amber-400 text-amber-900 bg-white hover:bg-amber-100" onClick={() => changeTab('setup')}>
            Open Setup
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="counter" className="gap-2">
            Counter
            {waiting > 0 && <Badge className="h-5 min-w-5 px-1.5 justify-center" aria-label={`${waiting} waiting`}>{waiting}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="accounts">ABHA accounts</TabsTrigger>
          <TabsTrigger value="records">Shared records</TabsTrigger>
          <TabsTrigger value="setup" className="gap-2">
            Setup
            {setupIssues.length > 0 && <span className="h-2 w-2 rounded-sm bg-amber-600" aria-label="needs attention" />}
          </TabsTrigger>
          <TabsTrigger value="log">Activity log</TabsTrigger>
        </TabsList>

        <TabsContent value="counter" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Patients who scan the hospital QR with their ABHA app appear here. To register one, open Book an appointment and choose Counter scans on the ABHA strip.
          </p>
          <CounterScanPanel hospitalId={hospitalId} mode="counter" onHandled={onWizardDone} onOpenSetup={() => changeTab('setup')} onWaitingCount={setWaiting} />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Search ABHA accounts"
                className="pl-9 h-10"
                placeholder="Search by patient, ABHA number or mobile"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="h-10 gap-2" onClick={() => setCreateOpen(true)}><UserPlus className="h-4 w-4" aria-hidden="true" /> Create ABHA</Button>
              <Button variant="secondary" className="h-10 gap-2" onClick={() => setLinkOpen(true)}><Link2 className="h-4 w-4" aria-hidden="true" /> Link existing</Button>
              <Button variant="outline" className="h-10 gap-2" onClick={() => setReactivateOpen(true)}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Reactivate</Button>
            </div>
          </div>
      {/* Accounts Table */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Accounts on Record
            <Badge variant="secondary" className="font-normal">{accounts.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 mb-4 animate-spin text-primary/50" /> 
              <p>Loading records...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileBadge2 className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No ABHA Accounts Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Create an ABHA or link an existing one with the buttons above, or do it while booking an appointment.
              </p>
            </div>
          ) : shownAccounts.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No account matches "{search.trim()}".</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b bg-muted/10">
                    <th className="py-4 px-6 font-medium">Patient Details</th>
                    <th className="py-4 px-6 font-medium">ABHA Details</th>
                    <th className="py-4 px-6 font-medium">Contact</th>
                    <th className="py-4 px-6 font-medium">How added</th>
                    <th className="py-4 px-6 font-medium">Added On</th>
                    <th className="py-4 px-6" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {shownAccounts.map(a => (
                    <tr key={a.abhaAccountId} className="hover:bg-muted/30 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shadow-sm border border-primary/20">
                            {a.fullName ? a.fullName.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="font-medium text-foreground">{a.fullName || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-mono text-sm">{a.abhaNumber}</span>
                          {a.abhaAddress && (
                            <span className="text-xs text-muted-foreground font-mono mt-0.5">{a.abhaAddress}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-foreground">{a.mobile || '—'}</span>
                          {a.email && (
                            <span className="text-xs text-muted-foreground mt-0.5">{a.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={a.source === 'Login' ? 'secondary' : 'default'} className="font-medium">
                          {a.source === 'Login' ? 'Linked' : 'Created Here'}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => setEditAccount(a)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/40 dark:text-red-400"
                            onClick={() => setRemoveAccount(a)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="records">
          <RecordLinkingPanel hospitalId={hospitalId} view="records" />
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <CounterScanPanel hospitalId={hospitalId} mode="setup" />
          <RecordLinkingPanel hospitalId={hospitalId} view="setup" />
        </TabsContent>

        <TabsContent value="log">
          <RecordLinkingPanel hospitalId={hospitalId} view="log" />
        </TabsContent>
      </Tabs>

      <CreateAbhaWizard hospitalId={hospitalId} open={createOpen} onOpenChange={setCreateOpen} onDone={onWizardDone} />
      <LinkExistingAbhaWizard hospitalId={hospitalId} open={linkOpen} onOpenChange={setLinkOpen} onDone={onWizardDone} />
      <EditAbhaProfileWizard
        hospitalId={hospitalId}
        account={editAccount}
        open={!!editAccount}
        onOpenChange={(v) => { if (!v) setEditAccount(null); }}
        onUpdated={onWizardDone}
      />
      <ReactivateAbhaDialog hospitalId={hospitalId} open={reactivateOpen} onOpenChange={setReactivateOpen} onReactivated={onWizardDone} />
      <AbdmGuidePanel open={guideOpen} onOpenChange={setGuideOpen} />

      <AlertDialog open={!!removeAccount} onOpenChange={(v) => { if (!v) setRemoveAccount(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this ABHA account?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes <span className="font-mono">{removeAccount?.abhaNumber}</span> from this hospital's local records.
              It does not deactivate or delete the ABHA number itself on ABDM — the patient's actual ABHA account is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} disabled={removing} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              {removing && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
