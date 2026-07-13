import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Copy, Check, Plus, Ban, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/axiosClient';

interface PublicApiClientSummary {
  apiClientId: string;
  clientName: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

// Admin screen to create/view/revoke the hospital's public API key(s) — used by external
// integrations (e.g. the Nexeagle booking website) to call the public doctors/booking endpoints.
export const PublicApiClientConfig: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { hospitalId } = useAuthStore();

  const translate = (key: string, fallback: string) => t(key, { defaultValue: fallback });

  const [clients, setClients] = useState<PublicApiClientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [clientName, setClientName] = useState('Nexeagle');
  const [isCreating, setIsCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadClients = useCallback(() => {
    if (!hospitalId) return;
    setIsLoading(true);
    apiClient.get<{ success: boolean; clients: PublicApiClientSummary[] }>(`/admin/public-api-clients?hospitalId=${hospitalId}`)
      .then((res) => setClients(res.clients ?? []))
      .catch(() => { /* non-fatal — list just stays empty */ })
      .finally(() => setIsLoading(false));
  }, [hospitalId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleCreate = async () => {
    if (!hospitalId || isCreating) return;
    setIsCreating(true);
    try {
      const res = await apiClient.post<{ success: boolean; message?: string; apiClientId?: string; apiKey?: string }>(
        '/admin/public-api-clients',
        { hospitalId, clientName }
      );
      if (res.success && res.apiKey) {
        setNewRawKey(res.apiKey);
        loadClients();
      } else {
        toast({ variant: 'destructive', title: translate('publicApiClients.createFailedTitle', 'Could not create key'), description: res.message ?? '' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: translate('publicApiClients.createFailedTitle', 'Could not create key'), description: e?.message ?? '' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (apiClientId: string) => {
    if (!hospitalId || revokingId) return;
    setRevokingId(apiClientId);
    try {
      const res = await apiClient.patch<{ success: boolean; message?: string }>(
        `/admin/public-api-clients/${apiClientId}/revoke?hospitalId=${hospitalId}`,
        {}
      );
      if (res.success) {
        toast({ title: translate('publicApiClients.revokedTitle', 'Key revoked') });
        loadClients();
      } else {
        toast({ variant: 'destructive', title: translate('publicApiClients.revokeFailedTitle', 'Could not revoke key'), description: res.message ?? '' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: translate('publicApiClients.revokeFailedTitle', 'Could not revoke key'), description: e?.message ?? '' });
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopy = async () => {
    if (!newRawKey) return;
    try {
      await navigator.clipboard.writeText(newRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — user can still select/copy the text manually.
    }
  };

  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    setClientName('Nexeagle');
    setNewRawKey(null);
    setCopied(false);
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              {translate('publicApiClients.title', 'Public API Keys')}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {translate('publicApiClients.description', 'Keys used by external websites (e.g. Nexeagle) to fetch doctor listings and submit pre-appointment bookings for this hospital.')}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {translate('publicApiClients.generateNew', 'Generate New Key')}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {translate('publicApiClients.empty', 'No API keys yet. Generate one to enable external booking integrations.')}
            </p>
          ) : (
            <div className="space-y-2">
              {clients.map((c) => (
                <div
                  key={c.apiClientId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{c.clientName || translate('publicApiClients.unnamed', 'Unnamed key')}</span>
                      <Badge className={c.isActive
                        ? 'bg-green-50 text-green-700 border-green-200 text-xs px-1.5 py-0.5'
                        : 'bg-gray-50 text-gray-500 border-gray-200 text-xs px-1.5 py-0.5'}>
                        {c.isActive ? translate('publicApiClients.active', 'Active') : translate('publicApiClients.revoked', 'Revoked')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {translate('publicApiClients.created', 'Created')} {new Date(c.createdAt).toLocaleDateString('en-IN')}
                      {c.lastUsedAt && ` · ${translate('publicApiClients.lastUsed', 'Last used')} ${new Date(c.lastUsedAt).toLocaleDateString('en-IN')}`}
                    </p>
                  </div>
                  {c.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5 shrink-0"
                      disabled={revokingId === c.apiClientId}
                      onClick={() => handleRevoke(c.apiClientId)}
                    >
                      {revokingId === c.apiClientId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                      {translate('publicApiClients.revoke', 'Revoke')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) closeCreateDialog(); else setShowCreateDialog(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translate('publicApiClients.generateNew', 'Generate New Key')}</DialogTitle>
            <DialogDescription>
              {newRawKey
                ? translate('publicApiClients.showOnceWarning', 'Copy this key now — it will not be shown again.')
                : translate('publicApiClients.createPrompt', 'Give this key a name so you can recognize it later.')}
            </DialogDescription>
          </DialogHeader>

          {newRawKey ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                {translate('publicApiClients.showOnceWarning', 'Copy this key now — it will not be shown again.')}
              </div>
              <div className="flex items-center gap-2">
                <Input readOnly value={newRawKey} className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="public-api-client-name">{translate('publicApiClients.nameLabel', 'Key name')}</Label>
              <Input
                id="public-api-client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nexeagle"
              />
            </div>
          )}

          <DialogFooter>
            {newRawKey ? (
              <Button onClick={closeCreateDialog}>{translate('common.done', 'Done')}</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeCreateDialog} disabled={isCreating}>
                  {translate('common.cancel', 'Cancel')}
                </Button>
                <Button onClick={handleCreate} disabled={isCreating || !clientName.trim()}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {translate('publicApiClients.generate', 'Generate')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
