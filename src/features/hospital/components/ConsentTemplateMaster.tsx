import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit2, Check, FileText } from 'lucide-react';
import { consentApi, type ConsentTemplateItem } from '@/features/ipd-redesign/services/consentApi';

export const ConsentTemplateMaster: React.FC = () => {
    const { toast } = useToast();
    const [templates, setTemplates] = useState<ConsentTemplateItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<ConsentTemplateItem | null>(null);

    const load = () => {
        setLoading(true);
        consentApi.getTemplates()
            .then(setTemplates)
            .catch(() => toast({ title: 'Error', description: 'Could not load templates', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleSave = () => {
        if (!editingItem) return;
        // Mock save logic
        if (editingItem.consentTemplateId) {
            setTemplates(prev => prev.map(t => t.consentTemplateId === editingItem.consentTemplateId ? editingItem : t));
            toast({ title: 'Template updated.' });
        } else {
            const newItem = { ...editingItem, consentTemplateId: 'CT-NEW-' + Date.now(), version: 1 };
            setTemplates(prev => [...prev, newItem]);
            toast({ title: 'Template created.' });
        }
        setEditingItem(null);
    };

    return (
        <Card className="border-0 shadow-none bg-transparent max-w-5xl mx-auto">
            <CardHeader className="px-0 pt-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                            <FileText className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                            Consent Templates
                        </CardTitle>
                        <CardDescription className="mt-1 text-slate-500">
                            Manage the legal consent verbiage used for procedures, admissions, and discharges.
                        </CardDescription>
                    </div>
                    <Button onClick={() => setEditingItem({ consentTemplateId: '', typeCode: 'PROCEDURE', title: '', bodyHtml: '', version: 1, isActive: true })} className="bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl h-10">
                        <Plus className="h-4 w-4 mr-2" /> Add Template
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                {loading ? (
                    <div className="p-8 text-center text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
                ) : editingItem ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between border-b pb-3 mb-2">
                            <h3 className="font-bold text-slate-800">{editingItem.consentTemplateId ? 'Edit Template' : 'New Template'}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs font-bold text-slate-500 uppercase">Title</Label>
                                <Input value={editingItem.title || ''} onChange={e => setEditingItem({ ...editingItem, title: e.target.value })} className="mt-1" placeholder="e.g. Endoscopy Consent" />
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-slate-500 uppercase">Category Type</Label>
                                <Select value={editingItem.typeCode} onValueChange={v => setEditingItem({ ...editingItem, typeCode: v })}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GENERAL_ADMISSION">General Admission</SelectItem>
                                        <SelectItem value="PROCEDURE">Procedure / Surgery</SelectItem>
                                        <SelectItem value="LAMA">Leave Against Medical Advice</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs font-bold text-slate-500 uppercase">Consent Verbiage (HTML/Rich Text)</Label>
                            <Textarea 
                                value={editingItem.bodyHtml || ''} 
                                onChange={e => setEditingItem({ ...editingItem, bodyHtml: e.target.value })} 
                                className="mt-1 h-48 font-mono text-xs" 
                                placeholder="<h4>Template Title</h4><p>Body text here...</p>" 
                            />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isActive" checked={editingItem.isActive} onChange={e => setEditingItem({ ...editingItem, isActive: e.target.checked })} />
                                <Label htmlFor="isActive" className="text-sm font-semibold text-slate-700">Active (Visible to doctors/staff)</Label>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                                <Button onClick={handleSave} className="bg-brand-600 hover:bg-brand-700 text-white"><Check className="h-4 w-4 mr-2" /> Save Template</Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {templates.map(t => (
                            <div key={t.consentTemplateId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-800">{t.title}</h4>
                                        {!t.isActive && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold">INACTIVE</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">{t.typeCode} · Version {t.version} · {t.language || 'English'}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setEditingItem(t)} className="text-brand-600 hover:bg-brand-50">
                                    <Edit2 className="h-4 w-4 mr-1.5" /> Edit
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
