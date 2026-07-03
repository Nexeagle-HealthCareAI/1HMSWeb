import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { dischargeSummaryApi } from '../services/dischargeSummaryApi';

interface Props {
    admissionId: string;
    onApply: (narrative: string) => void;
}

/**
 * "Generate AI draft" for the discharge summary's Course in Hospital field — mirrors Voice Rx's
 * review/apply simplicity (no diff view, one review card, Apply/Discard) but as a lighter-weight
 * button-triggered flow since there's no dictation/recording step: the source material is
 * already-recorded text data (round notes, procedures, medications).
 */
export const DischargeNarrativeAssist: React.FC<Props> = ({ admissionId, onApply }) => {
    const { toast } = useToast();
    const [status, setStatus] = useState<'idle' | 'loading' | 'review'>('idle');
    const [draft, setDraft] = useState('');

    const generate = async () => {
        setStatus('loading');
        try {
            const narrative = await dischargeSummaryApi.generateNarrative(admissionId);
            if (!narrative) {
                toast({ title: 'Nothing to summarize yet', description: 'No round notes/procedures/medications recorded for this admission.' });
                setStatus('idle');
                return;
            }
            setDraft(narrative);
            setStatus('review');
        } catch (err) {
            toast({ title: 'Could not generate a draft', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
            setStatus('idle');
        }
    };

    const apply = () => {
        onApply(draft);
        setStatus('idle');
    };

    if (status === 'review') {
        return (
            <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50 p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">AI draft — review before applying</p>
                <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{draft}</p>
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setStatus('idle')}><X className="h-3.5 w-3.5 mr-1" /> Discard</Button>
                    <Button size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700" onClick={apply}><Check className="h-3.5 w-3.5 mr-1" /> Apply</Button>
                </div>
            </div>
        );
    }

    return (
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs mt-1.5 border-violet-200 text-violet-700 hover:bg-violet-50" onClick={generate} disabled={status === 'loading'}>
            {status === 'loading' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            Generate AI draft
        </Button>
    );
};
