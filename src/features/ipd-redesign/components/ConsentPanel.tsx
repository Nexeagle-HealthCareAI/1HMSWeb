import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { consentApi, type ConsentTemplateItem, type ConsentRecordItem } from '../services/consentApi';
import { formatIstDateTime } from '../utils/istDate';
import { SignaturePad } from './SignaturePad';

interface Props {
    admissionId: string;
    isActive: boolean;
    prefilterTypeCode?: string;
}

export const ConsentPanel: React.FC<Props> = ({ admissionId, isActive, prefilterTypeCode }) => {
    const { toast } = useToast();
    const [templates, setTemplates] = useState<ConsentTemplateItem[]>([]);
    const [records, setRecords] = useState<ConsentRecordItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [signOpen, setSignOpen] = useState(false);
    const [templateId, setTemplateId] = useState('');
    const [procedureName, setProcedureName] = useState('');
    const [signedByName, setSignedByName] = useState('');
    const [signerRelation, setSignerRelation] = useState('Self');
    const [witnessName, setWitnessName] = useState('');
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([consentApi.getTemplates(prefilterTypeCode), consentApi.getRecords(admissionId)])
            .then(([t, r]) => { setTemplates(t); setRecords(r); })
            .catch(() => toast({ title: 'Could not load consent data', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const openSign = () => {
        const preferred = prefilterTypeCode ? templates.find(t => t.typeCode === prefilterTypeCode) : undefined;
        setTemplateId(preferred?.consentTemplateId ?? templates[0]?.consentTemplateId ?? '');
        setProcedureName('');
        setSignedByName('');
        setSignerRelation('Self');
        setWitnessName('');
        setSignatureDataUrl(null);
        setSignOpen(true);
    };

    const selectedTemplate = templates.find(t => t.consentTemplateId === templateId);

    const submit = async () => {
        if (!templateId || !signedByName.trim() || !signerRelation.trim() || submitting) {
            toast({ title: 'Incomplete', description: 'Template, signed-by name and relation are required.', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            await consentApi.sign(admissionId, templateId, {
                procedureName: procedureName || undefined,
                signedByName: signedByName.trim(),
                signerRelation: signerRelation.trim(),
                witnessName: witnessName || undefined,
                signatureImageBase64: signatureDataUrl ?? undefined,
            });
            toast({ title: 'Consent signed.' });
            setSignOpen(false);
            load();
        } catch (err) {
            toast({ title: 'Could not sign consent', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Consent</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none" onClick={load} disabled={loading}>
                        <RefreshCw className={loading ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'} /> Refresh
                    </Button>
                    {isActive && templates.length > 0 && (
                        <Button size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none bg-brand-600 hover:bg-brand-700 font-semibold" onClick={openSign}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Capture consent
                        </Button>
                    )}
                </div>
            </div>

            {loading && records.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : records.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                    {templates.length === 0 ? 'No consent templates configured for this hospital yet.' : 'No consents signed yet.'}
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {records.map(r => (
                        <div key={r.consentRecordId} className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                            <div>
                                <span className="font-semibold text-slate-900">{r.templateTitle ?? r.templateTypeCode}</span>
                                <span className="text-[11px] text-slate-400 ml-2">v{r.templateVersion}</span>
                                {r.procedureName && <span className="text-[11px] text-slate-500 ml-2">· {r.procedureName}</span>}
                                <p className="text-[11px] text-slate-500 mt-0.5">Signed by {r.signedByName} ({r.signerRelation}){r.witnessName ? ` · Witness: ${r.witnessName}` : ''}</p>
                            </div>
                            <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatIstDateTime(r.signedAt)}</span>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={signOpen} onOpenChange={setSignOpen}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Capture consent</DialogTitle>
                        <DialogDescription>Review the form with the patient/guardian, then sign.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Consent form</Label>
                        <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                            {templates.map(t => <option key={t.consentTemplateId} value={t.consentTemplateId}>{t.title ?? t.typeCode}</option>)}
                        </select>
                    </div>
                    {selectedTemplate?.bodyHtml && (
                        <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs prose prose-slate"
                            dangerouslySetInnerHTML={{ __html: selectedTemplate.bodyHtml }} />
                    )}
                    {selectedTemplate?.typeCode === 'PROCEDURE' && (
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Procedure name</Label>
                            <Input value={procedureName} onChange={e => setProcedureName(e.target.value)} className="h-9 mt-1" placeholder="Optional" />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Signed by *</Label>
                            <Input value={signedByName} onChange={e => setSignedByName(e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Relation *</Label>
                            <select value={signerRelation} onChange={e => setSignerRelation(e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                {['Self', 'Father', 'Mother', 'Spouse', 'Guardian', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Witness name</Label>
                        <Input value={witnessName} onChange={e => setWitnessName(e.target.value)} className="h-9 mt-1" placeholder="Optional" />
                    </div>
                    <SignaturePad onChange={setSignatureDataUrl} />
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                        <Button variant="outline" className="h-11 sm:h-10" onClick={() => setSignOpen(false)}>Cancel</Button>
                        <Button disabled={!templateId || !signedByName.trim() || submitting} onClick={submit} className="h-11 sm:h-10 bg-brand-600 hover:bg-brand-700">
                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Sign
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
