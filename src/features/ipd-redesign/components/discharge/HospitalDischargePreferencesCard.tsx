import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Languages, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dischargeSummaryApi, type HospitalDischargePreferences } from '../../services/dischargeSummaryApi';

/** Hospital-wide discharge choices (admins): print the patient advice also in Hindi, and AI help on/off. */
export const HospitalDischargePreferencesCard: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
    const { toast } = useToast();
    const [prefs, setPrefs] = useState<HospitalDischargePreferences | null>(null);
    const [language, setLanguage] = useState<string>('');
    const [aiOn, setAiOn] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!hospitalId) return;
        dischargeSummaryApi.getHospitalPreferences(hospitalId)
            .then(p => { setPrefs(p); setLanguage(p.patientLanguage ?? ''); setAiOn(p.aiAssistEnabled); })
            .catch(() => setPrefs(null));
    }, [hospitalId]);

    const dirty = !!prefs && ((prefs.patientLanguage ?? '') !== language || prefs.aiAssistEnabled !== aiOn);

    const save = async () => {
        setSaving(true);
        try {
            await dischargeSummaryApi.updateHospitalPreferences({ patientLanguage: language || null, aiAssistEnabled: aiOn }, hospitalId);
            setPrefs(p => (p ? { ...p, patientLanguage: language || null, aiAssistEnabled: aiOn } : p));
            toast({ title: 'Discharge settings saved.' });
        } catch (err) {
            toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    if (!prefs) return null;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Discharge summary — whole hospital</CardTitle>
                <CardDescription>Applies to every doctor's discharge summaries at this hospital.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                        <Label className="flex items-center gap-2 text-sm font-semibold"><Languages className="h-4 w-4 text-brand-600" /> Language of the patient advice</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">English is always printed. You can add a second language under it — AI translates it and staff can correct the wording.</p>
                    </div>
                    <div role="radiogroup" aria-label="Patient advice language" className="flex gap-1 p-1 rounded-full bg-slate-100 border border-slate-200 self-start">
                        <button type="button" role="radio" aria-checked={language === ''} onClick={() => setLanguage('')}
                            className={`h-9 px-4 rounded-full text-xs font-bold ${language === '' ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>English only</button>
                        {prefs.languageOptions.map(l => (
                            <button key={l.code} type="button" role="radio" aria-checked={language === l.code} onClick={() => setLanguage(l.code)}
                                className={`h-9 px-4 rounded-full text-xs font-bold ${language === l.code ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>English + {l.name}</button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                        <Label htmlFor="discharge-ai-switch" className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-brand-600" /> AI help when writing discharge summaries</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Drafting from the stay's records, dictation, rewriting and translation. Patient names, IDs and phone numbers are removed before anything is sent.
                            {!prefs.aiAvailable && ' AI is not set up on this server yet, so this has no effect for now.'}
                        </p>
                    </div>
                    <Switch id="discharge-ai-switch" checked={aiOn} onCheckedChange={setAiOn} />
                </div>

                <div className="flex justify-end">
                    <Button type="button" onClick={save} disabled={!dirty || saving} className="bg-brand-600 hover:bg-brand-700 text-white">
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Save
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
