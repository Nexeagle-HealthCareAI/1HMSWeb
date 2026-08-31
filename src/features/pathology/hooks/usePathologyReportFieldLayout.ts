import { useCallback, useEffect, useState } from 'react';
import { pathologyService } from '../services/pathologyService';
import { parseReportFieldLayout, type PathologyReportFieldLayout } from '../services/pathologyFieldLayoutApi';

const EMPTY_LAYOUT = parseReportFieldLayout(null);

/**
 * Loads the hospital's pathology report field layout (hospital-wide, not per-doctor -- a report
 * is issued by the lab, not any one doctor), merged over the built-in defaults. Persisted inside
 * LabConfiguration.ReportFieldLayoutJson, so saving re-fetches the current config first and only
 * overrides that one field -- same read-modify-write ReportLetterheadConfig.tsx's handleSaveAll
 * already uses, so this never clobbers letterhead settings it doesn't touch.
 */
export const usePathologyReportFieldLayout = (hospitalId?: string) => {
  const [layout, setLayout] = useState<PathologyReportFieldLayout>(EMPTY_LAYOUT);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const refetch = useCallback(async () => {
    if (!hospitalId) return;
    setIsLoading(true);
    try {
      const config = await pathologyService.getLabConfig(hospitalId);
      setLayout(parseReportFieldLayout(config.reportFieldLayoutJson));
    } catch {
      setLayout(EMPTY_LAYOUT);
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { refetch(); }, [refetch]);

  const saveLayout = useCallback(async (next: PathologyReportFieldLayout): Promise<boolean> => {
    if (!hospitalId) return false;
    setIsSaving(true);
    try {
      const current = await pathologyService.getLabConfig(hospitalId);
      const success = await pathologyService.updateLabConfig(hospitalId, {
        autoBillOnOrder: current.autoBillOnOrder,
        defaultReportHeaderBlob: current.defaultReportHeaderBlob,
        defaultReportFooterText: current.defaultReportFooterText,
        letterheadMode: current.letterheadMode,
        reportFieldLayoutJson: JSON.stringify(next),
      });
      if (success) setLayout(next);
      return success;
    } finally {
      setIsSaving(false);
    }
  }, [hospitalId]);

  return {
    reportFields: layout.reportFields,
    lineFields: layout.lineFields,
    isLoading,
    isSaving,
    refetch,
    saveLayout,
  };
};
