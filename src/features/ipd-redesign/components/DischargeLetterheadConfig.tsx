import React, { ChangeEvent, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useDepartmentApi, useDoctorApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { Loader2, ClipboardList, FileText, Ruler, Eye } from 'lucide-react';
import { useDischargeDesigner, type MarginConfig, type TypographySettings } from '../hooks/useDischargeDesigner';

const clampMargin = (value: number) => (Number.isNaN(value) ? 10 : Math.min(Math.max(value, 0), 1000));

/**
 * Configuration tab: design a discharge-summary letterhead (upload a PDF background, reserve
 * header/footer margins over it, set typography) — per doctor+hospital. Mirrors
 * PrescriptionConfig.tsx + LayoutControlsPanel.tsx + PreviewPanel.tsx, consolidated into one file
 * and stripped of i18n/ValidUpto (discharge has no prescription-style "valid for N days" concept).
 */
export const DischargeLetterheadConfig: React.FC = () => {
    const { hospitalId } = useAuthStore();
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [selectedDoctorId, setSelectedDoctorId] = useState('');

    const { data: departmentsData, isLoading: isLoadingDepartments } = useDepartmentApi.getDepartmentsByHospitalId(hospitalId || '');
    const { data: doctorsData, isLoading: isLoadingDoctors } = useDoctorApi.getDoctorsByDepartment(selectedDepartmentId, hospitalId || '');
    const doctors = useMemo(() => doctorsData ?? [], [doctorsData]);

    const designer = useDischargeDesigner(selectedDoctorId, hospitalId || undefined);

    const [successOpen, setSuccessOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    if (isLoadingDepartments || (selectedDepartmentId && isLoadingDoctors)) {
        return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const handleMarginChange = (side: keyof MarginConfig, event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        if (value === '') return;
        designer.updateMargins({ ...designer.layoutMargins, [side]: clampMargin(Number(value)) });
    };

    const handleTemplateChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) { designer.handleTemplateUpload(file); event.target.value = ''; }
    };

    const save = async () => {
        await designer.saveLayoutSettings();
        setSuccessMessage('Discharge letterhead settings saved.');
        setSuccessOpen(true);
    };

    const marginSides: { key: keyof MarginConfig; label: string }[] = [
        { key: 'top', label: 'Header height (mm)' },
        { key: 'bottom', label: 'Footer height (mm)' },
        { key: 'left', label: 'Left margin (mm)' },
        { key: 'right', label: 'Right margin (mm)' },
    ];

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-r from-brand-50/50 to-brand-50/50 dark:from-brand-900/10 dark:to-brand-900/10">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row items-end gap-4">
                        <div className="flex-1 w-full space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</Label>
                            <Select value={selectedDepartmentId} onValueChange={(v) => { setSelectedDepartmentId(v); setSelectedDoctorId(''); }}>
                                <SelectTrigger className="bg-white dark:bg-gray-950"><SelectValue placeholder="Select department" /></SelectTrigger>
                                <SelectContent>
                                    {(!departmentsData?.departments || departmentsData.departments.length === 0) && (
                                        <SelectItem value="none" disabled>No departments</SelectItem>
                                    )}
                                    {departmentsData?.departments.map((dept) => (
                                        <SelectItem key={dept.departmentID} value={dept.departmentID}>{dept.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 w-full space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Doctor</Label>
                            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId} disabled={!selectedDepartmentId}>
                                <SelectTrigger className="bg-white dark:bg-gray-950">
                                    <SelectValue placeholder={selectedDepartmentId ? (doctors.length > 0 ? 'Select doctor' : 'No doctors in department') : 'Select department first'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {doctors.length === 0 && selectedDepartmentId && <SelectItem value="none" disabled>No doctors</SelectItem>}
                                    {doctors.map((doc) => <SelectItem key={doc.userId} value={doc.userId}>{doc.fullName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" size="sm" className="h-10 px-4 gap-2 whitespace-nowrap"
                            onClick={() => designer.generatePreview().then(() => designer.openPreviewInNewTab())} disabled={!selectedDoctorId}>
                            <Eye className="h-4 w-4" /> Live Preview
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {selectedDoctorId ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Layout controls */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Letterhead template</CardTitle>
                                <CardDescription>Upload your own pre-designed A4 PDF as the background for every printed discharge summary.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-center text-sm text-primary hover:bg-primary/10">
                                    <span className="font-medium">Upload letterhead PDF</span>
                                    <span className="text-xs text-primary/80">Ideally A4 — non-A4 files are auto-converted</span>
                                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Choose file</span>
                                    <Input type="file" accept="application/pdf" className="hidden" onChange={handleTemplateChange} disabled={designer.isAnalyzingTemplate} />
                                </label>
                                {designer.templateError && <p className="text-sm text-destructive">{designer.templateError}</p>}
                                {designer.templateMeta && (
                                    <div className="rounded-md border p-3 text-sm">
                                        <p className="font-medium">{designer.templateMeta.fileName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {designer.templateMeta.fileSizeKb} KB · {designer.templateMeta.orientationHint.toUpperCase()} · {designer.templateMeta.pageSize.width} × {designer.templateMeta.pageSize.height} mm
                                        </p>
                                        {designer.templateMeta.wasConverted && designer.templateMeta.originalPageSize && (
                                            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                                Non-A4 upload converted from {designer.templateMeta.originalPageSize.width} × {designer.templateMeta.originalPageSize.height} mm to standard A4.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base"><Ruler className="h-4 w-4" /> Layout &amp; typography</CardTitle>
                                <CardDescription>Margins reserve header/footer space over your letterhead; typography controls the printed text.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {marginSides.map(({ key, label }) => (
                                        <div key={key} className="space-y-1.5">
                                            <Label htmlFor={`margin-${key}`}>{label}</Label>
                                            <Input id={`margin-${key}`} type="number" min={0} max={1000} value={designer.layoutMargins[key]} onChange={(e) => handleMarginChange(key, e)} />
                                        </div>
                                    ))}
                                </div>

                                <Separator />

                                <div className="space-y-4 text-sm">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">On overflow to a 2nd page</p>
                                        <p className="text-xs text-muted-foreground">What happens when a discharge summary runs longer than one page.</p>
                                    </div>
                                    <RadioGroup value={designer.overflowStrategy} onValueChange={(v) => designer.setOverflowStrategy(v as 'reuse-template' | 'blank')} className="space-y-3">
                                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left">
                                            <RadioGroupItem value="reuse-template" className="mt-1" />
                                            <div><p className="font-medium text-foreground">Reuse letterhead</p><p className="text-xs text-muted-foreground">Repeat the uploaded background on overflow pages.</p></div>
                                        </label>
                                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left">
                                            <RadioGroupItem value="blank" className="mt-1" />
                                            <div><p className="font-medium text-foreground">Blank page</p><p className="text-xs text-muted-foreground">Continue on a plain white page instead.</p></div>
                                        </label>
                                    </RadioGroup>
                                </div>

                                <Separator />

                                <div className="space-y-5">
                                    <p className="text-sm font-semibold text-foreground">Typography</p>
                                    <div className="space-y-1.5">
                                        <Label>Font family</Label>
                                        <Select value={designer.typography.family} onValueChange={(v) => designer.updateTypography({ family: v as TypographySettings['family'] })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Times">Times New Roman</SelectItem>
                                                <SelectItem value="Helvetica">Helvetica</SelectItem>
                                                <SelectItem value="Arial">Arial</SelectItem>
                                                <SelectItem value="Courier">Courier</SelectItem>
                                                <SelectItem value="Georgia">Georgia</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label>Font weight</Label>
                                            <Select value={designer.typography.weight} onValueChange={(v) => designer.updateTypography({ weight: v as TypographySettings['weight'] })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="regular">Regular</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="bold">Bold</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="font-size">Font size (pt)</Label>
                                            <Input
                                                id="font-size"
                                                type="number"
                                                min={8}
                                                max={24}
                                                value={designer.typography.size}
                                                onChange={(e) => {
                                                    const v = Number(e.target.value);
                                                    if (!Number.isNaN(v)) designer.updateTypography({ size: Math.min(Math.max(v, 8), 24) });
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="font-color">Text color</Label>
                                        <div className="flex items-center gap-3">
                                            <Input id="font-color" type="color" className="h-10 w-16 cursor-pointer p-1" value={designer.typography.color} onChange={(e) => designer.updateTypography({ color: e.target.value })} />
                                            <Input value={designer.typography.color} onChange={(e) => designer.updateTypography({ color: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button type="button" variant="outline" onClick={() => designer.generatePreview().then(() => designer.openPreviewInNewTab())}>
                                        <Eye className="h-4 w-4 mr-2" /> Preview
                                    </Button>
                                    <Button type="button" onClick={save} disabled={designer.isSavingLayout}>
                                        {designer.isSavingLayout ? 'Saving…' : 'Save'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Preview */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Preview</CardTitle>
                                <CardDescription>A mock A4 render using sample discharge data — the real print uses the signed summary's actual content.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-lg border bg-muted/30 p-4">
                                    <AspectRatio ratio={3 / 4}>
                                        {designer.previewUrl ? (
                                            <iframe src={designer.previewUrl} title="Discharge letterhead preview" className="h-full w-full rounded-md border" />
                                        ) : (
                                            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                                                {designer.isGeneratingPreview ? <Skeleton className="h-10 w-3/4" /> : <Eye className="h-6 w-6" />}
                                                <p>{designer.isGeneratingPreview ? 'Generating preview…' : 'No preview yet'}</p>
                                            </div>
                                        )}
                                    </AspectRatio>
                                </div>
                                <Button type="button" variant="secondary" size="sm" onClick={designer.openPreviewInNewTab} disabled={!designer.previewUrl}>
                                    Open in new tab
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="rounded-full bg-primary/10 p-4 mb-4"><ClipboardList className="h-8 w-8 text-primary" /></div>
                        <h3 className="text-lg font-semibold">No doctor selected</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">Pick a department and doctor above to design their discharge letterhead.</p>
                    </CardContent>
                </Card>
            )}

            <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Saved</DialogTitle>
                        <DialogDescription>{successMessage}</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end">
                        <Button type="button" onClick={() => setSuccessOpen(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DischargeLetterheadConfig;
