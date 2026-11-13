import React from 'react';
import { Link2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { abdmCanRetry, abdmLinkStatusText, type AbdmCareContextSource } from '../services/abdmApi';
import { canUseAbdm, useAbdmCareContextFor, useLinkAbdmCareContext } from '../hooks/useAbdmCareContexts';

interface Props {
  hospitalId: string;
  sourceType: AbdmCareContextSource;
  /** Appointment id for OPD, admission id for IPD. */
  sourceId: string;
  /** "icon" for dense tables, "full" where there is room for words. */
  variant?: 'icon' | 'full';
}

/**
 * Links one OPD visit or IPD admission to the patient's ABHA, so their own health app and other
 * hospitals (with the patient's consent) can find it. Starting returns at once; the icon then
 * follows the link through ABDM's answers without anyone waiting on it.
 */
export const AbdmLinkButton: React.FC<Props> = ({ hospitalId, sourceType, sourceId, variant = 'icon' }) => {
  const { toast } = useToast();
  const { careContext } = useAbdmCareContextFor(hospitalId, sourceId);
  const link = useLinkAbdmCareContext(hospitalId);

  if (!canUseAbdm() || !hospitalId || !sourceId) return null;

  const status = careContext?.linkStatus ?? 'NOT_LINKED';
  const busy = link.isPending || status === 'TOKEN_REQUESTED' || status === 'LINK_REQUESTED';
  const canStart = !link.isPending && (!careContext || abdmCanRetry(careContext));
  const text = careContext ? abdmLinkStatusText(careContext) : 'Not linked to ABHA. Click to link this visit so the patient sees it in their ABHA app.';

  const start = async () => {
    try {
      const res = await link.mutateAsync({ sourceType, sourceId });
      const now = res.careContext?.linkStatus;
      toast({
        title: now === 'FAILED' ? 'ABDM refused the link' : 'Linking started',
        description: res.careContext ? abdmLinkStatusText(res.careContext) : undefined,
        variant: now === 'FAILED' ? 'destructive' : 'default',
      });
    } catch (e: any) {
      // Refusals decided before sending (no ABHA, no records yet, no HIP ID) come back as 400.
      toast({ title: 'Could not link to ABHA', description: e?.response?.data?.Message || e?.response?.data?.message || e?.message, variant: 'destructive' });
    }
  };

  const icon = status === 'LINKED' ? <CheckCircle2 className="h-4 w-4" />
    : busy ? <Loader2 className="h-4 w-4 animate-spin" />
    : status === 'FAILED' ? <AlertTriangle className="h-4 w-4" />
    : <Link2 className="h-4 w-4" />;
  const tone = status === 'LINKED' ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
    : status === 'FAILED' ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
    : 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20';
  const label = status === 'LINKED' ? 'Linked to ABHA' : busy ? 'Linking…' : status === 'FAILED' ? 'Retry ABHA link' : 'Link to ABHA';

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {/* A span keeps the tooltip working while the button is disabled. */}
          <span className="inline-flex">
            <Button
              variant="ghost"
              size={variant === 'icon' ? 'sm' : 'default'}
              className={`${variant === 'icon' ? 'h-8 px-2' : ''} rounded-lg transition-colors mr-1 ${tone}`}
              onClick={start}
              disabled={!canStart}
              aria-label={label}
            >
              {icon}
              {variant === 'full' && <span className="ml-2">{label}</span>}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
