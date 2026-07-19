import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useDepartmentApi, useAuthApi, useDoctorApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { LayoutControlsPanel } from './layout/LayoutControlsPanel';
import { PreviewPanel } from './layout/PreviewPanel';
import { TemplateUploadSuccessModal } from './modals/TemplateUploadSuccessModal';
import { LayoutSaveSuccessModal } from './modals/LayoutSaveSuccessModal';
import { usePrescriptionDesigner } from '../hooks/usePrescriptionDesigner';
import { Loader2, Users, ClipboardList, Eye } from 'lucide-react';

export const PrescriptionConfig: React.FC = () => {
    const { t } = useTranslation();
    const { hospitalId } = useAuthStore();
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

    // APIs
    const { data: departmentsData, isLoading: isLoadingDepartments } = useDepartmentApi.getDepartmentsByHospitalId(hospitalId || '');
    const { data: doctorsData, isLoading: isLoadingDoctors } = useDoctorApi.getDoctorsByDepartment(
        selectedDepartmentId,
        hospitalId || ''
    );

    // Diagnostic logging
    console.log('PrescriptionConfig - Hospital ID:', hospitalId);
    console.log('PrescriptionConfig - Departments Data:', departmentsData);
    console.log('PrescriptionConfig - Selected Dept:', selectedDepartmentId);
    console.log('PrescriptionConfig - Doctors Data:', doctorsData);

    // Doctors list from the department-specific API
    const filteredDoctors = useMemo(() => {
        if (!doctorsData) return [];
        return doctorsData;
    }, [doctorsData]);

    // Designer Hook for selected doctor
    const designer = usePrescriptionDesigner(selectedDoctorId, hospitalId || undefined);

    if (isLoadingDepartments || (selectedDepartmentId && isLoadingDoctors)) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-lg font-medium">{t('prescriptionDesigner.messages.loading')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-r from-brand-50/50 to-brand-50/50 dark:from-brand-900/10 dark:to-brand-900/10">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row items-end gap-4">
                        <div className="flex-1 w-full space-y-1.5">
                            <Label htmlFor="department-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('prescriptionDesigner.selectingDoctor.department')}</Label>
                            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                                <SelectTrigger id="department-select" className="bg-white dark:bg-gray-950 max-sm:border-transparent max-sm:rounded-xl max-sm:h-12">
                                    <SelectValue placeholder={t('prescriptionDesigner.selectingDoctor.selectDepartment')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {(!departmentsData?.departments || departmentsData.departments.length === 0) && (
                                        <SelectItem value="none" disabled>{t('prescriptionDesigner.selectingDoctor.noDepartments')}</SelectItem>
                                    )}
                                    {departmentsData?.departments.map((dept) => (
                                        <SelectItem key={dept.departmentID} value={dept.departmentID}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 w-full space-y-1.5">
                            <Label htmlFor="doctor-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('prescriptionDesigner.selectingDoctor.doctor')}</Label>
                            <Select
                                value={selectedDoctorId}
                                onValueChange={setSelectedDoctorId}
                                disabled={!selectedDepartmentId}
                            >
                                <SelectTrigger id="doctor-select" className="bg-white dark:bg-gray-950 max-sm:border-transparent max-sm:rounded-xl max-sm:h-12">
                                    <SelectValue placeholder={selectedDepartmentId ? (filteredDoctors.length > 0 ? t('prescriptionDesigner.selectingDoctor.selectDoctor') : t('prescriptionDesigner.selectingDoctor.noDoctorsInDept')) : t('prescriptionDesigner.selectingDoctor.selectDepartmentFirst')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredDoctors.length === 0 && selectedDepartmentId && (
                                        <SelectItem value="none" disabled>{t('prescriptionDesigner.selectingDoctor.noDoctors')}</SelectItem>
                                    )}
                                    {filteredDoctors.map((doc) => (
                                        <SelectItem key={doc.userId} value={doc.userId}>
                                            {doc.fullName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-10 max-sm:h-12 max-sm:rounded-xl px-4 gap-2 whitespace-nowrap"
                                onClick={() => designer.generatePreview().then(() => designer.openPreviewInNewTab())}
                                disabled={!selectedDoctorId}
                            >
                                <Eye className="h-4 w-4" />
                                {t('prescriptionDesigner.preview.livePreview')}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedDoctorId ? (
                <div className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <LayoutControlsPanel
                                margins={designer.layoutMargins}
                                onMarginsChange={designer.updateMargins}
                                overflowStrategy={designer.overflowStrategy}
                                onOverflowChange={designer.setOverflowStrategy}
                                templateMeta={designer.templateMeta}
                                templateError={designer.templateError}
                                isAnalyzingTemplate={designer.isAnalyzingTemplate}
                                onTemplateUpload={designer.handleTemplateUpload}
                                typography={designer.typography}
                                onTypographyChange={designer.updateTypography}
                                validUpto={designer.validUpto}
                                onValidUptoChange={designer.setValidUpto}
                                onSaveLayout={designer.saveLayoutSettings}
                                isSavingLayout={designer.isSavingLayout}
                                onPreview={() => designer.generatePreview().then(() => designer.openPreviewInNewTab())}
                            />
                        </div>
                        <div className="space-y-6">
                            <PreviewPanel
                                previewUrl={designer.previewUrl}
                                isGenerating={designer.isGeneratingPreview || designer.isLoadingLayoutSettings}
                                onOpen={designer.openPreviewInNewTab}
                                isTestEnabled={Boolean(designer.templateMeta || designer.serverTemplateUri)}
                                margins={designer.layoutMargins}
                                typography={designer.typography}
                                overflowStrategy={designer.overflowStrategy}
                                templateFile={designer.templateFile}
                                templateUrl={designer.serverTemplateUri}
                            />
                        </div>
                    </div>

                    <TemplateUploadSuccessModal
                        open={designer.templateUploadSuccessOpen}
                        onOpenChange={designer.setTemplateUploadSuccessOpen}
                        message={designer.templateUploadSuccessMessage}
                    />
                    <LayoutSaveSuccessModal
                        open={designer.layoutSaveSuccessOpen}
                        onOpenChange={designer.setLayoutSaveSuccessOpen}
                        message={designer.layoutSaveSuccessMessage}
                    />
                </div>
            ) : (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="rounded-full bg-primary/10 p-4 mb-4">
                            <ClipboardList className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold">{t('prescriptionDesigner.messages.noDoctorSelected')}</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            {t('prescriptionDesigner.messages.pleaseChooseDoctor')}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
