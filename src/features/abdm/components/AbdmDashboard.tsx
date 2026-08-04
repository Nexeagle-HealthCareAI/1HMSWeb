import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Link2, Loader2, FileBadge2, Pencil, HelpCircle, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store';
import { abdmApi, type AbhaAccountSummary } from '../services/abdmApi';
import { CreateAbhaWizard } from './CreateAbhaWizard';
import { LinkExistingAbhaWizard } from './LinkExistingAbhaWizard';
import { EditAbhaProfileWizard } from './EditAbhaProfileWizard';
import { AbdmGuidePanel } from './AbdmGuidePanel';
import { ReactivateAbhaDialog } from './ReactivateAbhaDialog';

export const AbdmDashboard: React.FC = () => {
  const { toast } = useToast();
  const hospitalId = useAuthStore(s => s.hospitalId) || '';
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<AbhaAccountSummary | null>(null);
  const [accounts, setAccounts] = useState<AbhaAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);

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

  const onWizardDone = () => {
    void load();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <FileBadge2 className="h-8 w-8" />
            </div>
            Ayushman Bharat Digital Mission (ABDM)
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Manage patient ABHA (Ayushman Bharat Health Account) records. Create new IDs, link existing accounts, and maintain digital health identities for your facility.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md transition-all" onClick={() => setGuideOpen(true)}>
            <HelpCircle className="h-4 w-4" /> 
            Integration Guide
          </Button>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md hover:border-blue-500/50 transition-all cursor-pointer group bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-zinc-950 border-blue-100 dark:border-blue-900/30" onClick={() => setCreateOpen(true)}>
          <CardContent className="p-6 flex flex-col items-start gap-4">
            <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-sm group-hover:scale-110 group-hover:shadow-blue-200 dark:group-hover:shadow-blue-900 transition-all">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-blue-950 dark:text-blue-100">Create New ABHA</h3>
              <p className="text-sm text-blue-700/70 dark:text-blue-400/70 mt-1 leading-relaxed">Enroll a patient using their Aadhaar and mobile number.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer group bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-zinc-950 border-emerald-100 dark:border-emerald-900/30" onClick={() => setLinkOpen(true)}>
          <CardContent className="p-6 flex flex-col items-start gap-4">
            <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-sm group-hover:scale-110 group-hover:shadow-emerald-200 dark:group-hover:shadow-emerald-900 transition-all">
              <Link2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-emerald-950 dark:text-emerald-100">Link Existing ABHA</h3>
              <p className="text-sm text-emerald-700/70 dark:text-emerald-400/70 mt-1 leading-relaxed">Attach an existing ABHA to your hospital records securely.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md hover:border-amber-500/50 transition-all cursor-pointer group bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-zinc-950 border-amber-100 dark:border-amber-900/30" onClick={() => setReactivateOpen(true)}>
          <CardContent className="p-6 flex flex-col items-start gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm group-hover:scale-110 group-hover:shadow-amber-200 dark:group-hover:shadow-amber-900 transition-all">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-amber-950 dark:text-amber-100">Reactivate ABHA</h3>
              <p className="text-sm text-amber-700/70 dark:text-amber-400/70 mt-1 leading-relaxed">Restore a deactivated or inactive ABHA account quickly.</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
                Get started by creating a new ABHA or linking an existing one using the quick actions above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b bg-muted/10">
                    <th className="py-4 px-6 font-medium">Patient Details</th>
                    <th className="py-4 px-6 font-medium">ABHA Details</th>
                    <th className="py-4 px-6 font-medium">Contact</th>
                    <th className="py-4 px-6 font-medium">Source</th>
                    <th className="py-4 px-6 font-medium">Added On</th>
                    <th className="py-4 px-6" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {accounts.map(a => (
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
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 border border-transparent group-hover:border-border/50"
                          onClick={() => setEditAccount(a)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
