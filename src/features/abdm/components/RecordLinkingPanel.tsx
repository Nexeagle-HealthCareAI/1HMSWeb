import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileStack, Loader2, OctagonX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  abdmApi, abdmLinkStatusText, abdmUtc,
  type AbdmCareContext, type AbdmExchange, type AbdmExchangeStatus, type AbdmInboundRequest,
} from '../services/abdmApi';
import { canUseAbdm, useAbdmCareContexts } from '../hooks/useAbdmCareContexts';
import { AbdmLinkButton } from './AbdmLinkButton';

interface Props {
  hospitalId: string;
}

const when = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(abdmUtc(iso)) : '—';

const KIND_LABEL: Record<string, string> = {
  'link-token': 'Ask ABDM for a link token',
  'link-carecontext': 'Link a visit',
};

// What ABDM is asking us, in words a person reads. Unknown paths are shown as they arrived.
const requestLabel = (path: string): string => {
  const p = path.toLowerCase();
  if (p.endsWith('care-context/discover')) return 'A patient is searching for their records (discovery)';
  if (p.endsWith('care-context/init')) return 'A patient is linking records (start)';
  if (p.endsWith('care-context/confirm')) return 'A patient is linking records (confirm)';
  if (p.endsWith('consent/request/hip/notify')) return 'Consent granted or revoked';
  if (p.endsWith('health-information/request')) return 'Request for records under a consent';
  return path;
};

const EXCHANGE_BADGE: Record<AbdmExchangeStatus, { text: string; className: string }> = {
  SENT: { text: 'Sending', className: 'bg-slate-100 text-slate-700' },
  ACCEPTED: { text: 'Accepted, waiting for ABDM', className: 'bg-blue-100 text-blue-700' },
  DONE: { text: 'Done', className: 'bg-emerald-100 text-emerald-700' },
  ANSWERED: { text: 'Answered', className: 'bg-emerald-100 text-emerald-700' },
  REFUSED: { text: 'Refused', className: 'bg-red-100 text-red-700' },
  NO_ANSWER: { text: 'No answer', className: 'bg-amber-100 text-amber-800' },
};

const STATUS_CLASS: Record<AbdmCareContext['linkStatus'], string> = {
  NOT_LINKED: 'bg-slate-100 text-slate-700',
  TOKEN_REQUESTED: 'bg-blue-100 text-blue-700',
  LINK_REQUESTED: 'bg-blue-100 text-blue-700',
  LINKED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
};

const STATUS_SHORT: Record<AbdmCareContext['linkStatus'], string> = {
  NOT_LINKED: 'Not linked',
  TOKEN_REQUESTED: 'Getting link token',
  LINK_REQUESTED: 'Linking',
  LINKED: 'Linked',
  FAILED: 'Failed',
};

/**
 * ABDM M2 on the ABDM page: readiness, the visits linked to patients' ABHA, and two integrator
 * views — every call we made with the answer it got, and every request ABDM made of us. Header
 * values are never shown, only their names and lengths.
 */
export const RecordLinkingPanel: React.FC<Props> = ({ hospitalId }) => {
  const enabled = !!hospitalId && canUseAbdm();

  const readiness = useQuery({
    queryKey: ['abdm', 'm2-readiness', hospitalId],
    queryFn: () => abdmApi.getM2Readiness(hospitalId),
    enabled,
    staleTime: 30_000,
  });
  const careContexts = useAbdmCareContexts(hospitalId);
  const exchanges = useQuery({
    queryKey: ['abdm', 'exchanges', hospitalId],
    queryFn: () => abdmApi.getExchanges(hospitalId),
    enabled,
    refetchInterval: q => (q.state.data?.exchanges.some(e => e.status === 'ACCEPTED' || e.status === 'SENT') ? 5_000 : false),
  });
  const inbound = useQuery({
    queryKey: ['abdm', 'inbound', hospitalId],
    queryFn: () => abdmApi.getInboundRequests(hospitalId),
    enabled,
    refetchInterval: 30_000,
  });

  if (!enabled) return null;

  const rows = careContexts.data ?? [];
  const linked = rows.filter(c => c.linkStatus === 'LINKED').length;
  const notFindable = rows.length - linked;
  const issues = readiness.data?.issues ?? [];
  const unanswered = (inbound.data?.requests ?? []).filter(r => r.unanswered).length;

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FileStack className="h-5 w-5 text-indigo-600" />
          Health records linked to ABHA
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Link a completed OPD visit (Doctor board) or a signed discharge (IPD) so the patient sees it in their ABHA app.
          {rows.length > 0 && <> {linked} linked · {notFindable} not yet findable elsewhere.</>}
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {readiness.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking ABDM setup…</div>
        ) : issues.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Ready. Facility (HIP) ID {readiness.data?.hipId}; last answer from ABDM {when(readiness.data?.lastCallbackAt)}.
          </div>
        ) : (
          issues.map(issue => (
            <Alert key={issue.text} variant={issue.level === 'blocker' ? 'destructive' : 'default'}
              className={issue.level === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : undefined}>
              {issue.level === 'blocker' ? <OctagonX className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertDescription>{issue.text}</AlertDescription>
            </Alert>
          ))
        )}

        <Tabs defaultValue="visits">
          <TabsList>
            <TabsTrigger value="visits">Linked visits ({rows.length})</TabsTrigger>
            <TabsTrigger value="activity">ABDM activity</TabsTrigger>
            <TabsTrigger value="requests">Requests from ABDM{unanswered > 0 ? ` (${unanswered} unanswered)` : ''}</TabsTrigger>
          </TabsList>

          <TabsContent value="visits">
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No visits linked yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Visit</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(c => (
                    <TableRow key={c.careContextId}>
                      <TableCell className="font-mono text-xs">{c.patientId}</TableCell>
                      <TableCell>{c.display}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">{c.hiTypes.map(t => <Badge key={t} variant="outline" className="text-[11px]">{t}</Badge>)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_CLASS[c.linkStatus]}>{STATUS_SHORT[c.linkStatus]}</Badge>
                        {c.linkStatus === 'FAILED' && <p className="mt-1 text-xs text-muted-foreground max-w-xs">{abdmLinkStatusText(c)}</p>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{when(c.updatedAt)}</TableCell>
                      <TableCell><AbdmLinkButton hospitalId={hospitalId} sourceType={c.sourceType} sourceId={c.sourceId} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="activity">
            <ExchangeTable exchanges={exchanges.data?.exchanges ?? []} windowSeconds={exchanges.data?.callbackWindowSeconds ?? 60} bridgeMissing={readiness.data?.bridgeSettingsPresent === false} />
          </TabsContent>

          <TabsContent value="requests">
            <InboundTable requests={inbound.data?.requests ?? []} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const ExchangeTable: React.FC<{ exchanges: AbdmExchange[]; windowSeconds: number; bridgeMissing: boolean }> = ({ exchanges, windowSeconds, bridgeMissing }) =>
  exchanges.length === 0 ? (
    <p className="py-6 text-center text-sm text-muted-foreground">No calls to ABDM yet.</p>
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sent</TableHead>
          <TableHead>Call</TableHead>
          <TableHead>Outcome</TableHead>
          <TableHead>Detail</TableHead>
          <TableHead>Request ID</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {exchanges.map(e => (
          <TableRow key={e.requestId}>
            <TableCell className="text-xs whitespace-nowrap">{when(e.sentAt)}</TableCell>
            <TableCell>
              <div>{KIND_LABEL[e.kind] ?? e.kind}</div>
              {e.subjectRef && <div className="text-xs text-muted-foreground font-mono">{e.subjectRef}</div>}
            </TableCell>
            <TableCell>
              <Badge className={EXCHANGE_BADGE[e.status].className}>{EXCHANGE_BADGE[e.status].text}</Badge>
              {e.waitMs != null && <div className="mt-1 text-xs text-muted-foreground">answered after {(e.waitMs / 1000).toFixed(1)} s</div>}
            </TableCell>
            <TableCell className="text-xs max-w-sm">
              {e.status === 'NO_ANSWER' && (
                <p>Accepted, but nothing came back within {windowSeconds} s.{bridgeMissing ? ' This server has no callback URL configured, so the answer had nowhere to go.' : ' Check the bridge URL is registered with ABDM.'}</p>
              )}
              {(e.errorCode || e.errorMessage) && <p className="text-red-700">{e.errorCode ? `${e.errorCode}: ` : ''}{e.errorMessage}</p>}
              {e.callbackPath && <p className="text-muted-foreground">Answer on <span className="font-mono">{e.callbackPath}</span></p>}
              {e.callbackHeaders && <p className="text-muted-foreground font-mono break-all">headers: {e.callbackHeaders}</p>}
            </TableCell>
            <TableCell className="font-mono text-[11px] text-muted-foreground">{e.requestId}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

const InboundTable: React.FC<{ requests: AbdmInboundRequest[] }> = ({ requests }) =>
  requests.length === 0 ? (
    <p className="py-6 text-center text-sm text-muted-foreground">ABDM has not asked this hospital anything yet.</p>
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Received</TableHead>
          <TableHead>ABDM asked</TableHead>
          <TableHead>Our reply</TableHead>
          <TableHead>Headers received</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={`${r.path}-${r.receivedAt}`}>
            <TableCell className="text-xs whitespace-nowrap">{when(r.receivedAt)}</TableCell>
            <TableCell>
              <div>{requestLabel(r.path)}</div>
              <div className="text-xs text-muted-foreground font-mono">{r.path}</div>
            </TableCell>
            <TableCell>
              {r.verdict !== 'ACCEPTED' ? (
                <Badge className="bg-slate-100 text-slate-700">Rejected ({r.verdict.replace('REJECTED_', '').toLowerCase().replace(/_/g, ' ')})</Badge>
              ) : r.unanswered ? (
                <Badge className="bg-amber-100 text-amber-800">Not answered yet</Badge>
              ) : r.processError ? (
                <span className="text-xs text-red-700">{r.processError}</span>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-700">Answered {when(r.processedAt)}</Badge>
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground font-mono break-all max-w-xs">{r.headerNames}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
