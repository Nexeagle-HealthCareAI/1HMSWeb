import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Link2, Loader2, FileBadge2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store';
import { abdmApi, type AbhaAccountSummary } from '../services/abdmApi';
import { CreateAbhaWizard } from './CreateAbhaWizard';
import { LinkExistingAbhaWizard } from './LinkExistingAbhaWizard';

type Mode = 'list' | 'create' | 'link';

export const AbdmDashboard: React.FC = () => {
  const { toast } = useToast();
  const hospitalId = useAuthStore(s => s.hospitalId) || '';
  const [mode, setMode] = useState<Mode>('list');
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
    setMode('list');
    void load();
  };

  if (mode === 'create') {
    return (
      <div className="p-6">
        <CreateAbhaWizard hospitalId={hospitalId} onDone={onWizardDone} onCancel={() => setMode('list')} />
      </div>
    );
  }

  if (mode === 'link') {
    return (
      <div className="p-6">
        <LinkExistingAbhaWizard hospitalId={hospitalId} onDone={onWizardDone} onCancel={() => setMode('list')} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileBadge2 className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">ABHA / ABDM</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMode('link')}>
            <Link2 className="h-4 w-4 mr-2" /> Link existing ABHA
          </Button>
          <Button onClick={() => setMode('create')}>
            <UserPlus className="h-4 w-4 mr-2" /> Create new ABHA
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ABHA accounts on record</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading…
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No ABHA accounts yet — create a new one or link an existing ABHA to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">ABHA number</th>
                    <th className="py-2 pr-4">ABHA address</th>
                    <th className="py-2 pr-4">Mobile</th>
                    <th className="py-2 pr-4">Source</th>
                    <th className="py-2 pr-4">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(a => (
                    <tr key={a.abhaAccountId} className="border-b last:border-0">
                      <td className="py-2 pr-4">{a.fullName || '—'}</td>
                      <td className="py-2 pr-4 font-mono">{a.abhaNumber}</td>
                      <td className="py-2 pr-4 font-mono">{a.abhaAddress || '—'}</td>
                      <td className="py-2 pr-4">{a.mobile || '—'}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={a.source === 'Login' ? 'secondary' : 'default'}>
                          {a.source === 'Login' ? 'Linked' : 'Created here'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</td>
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
