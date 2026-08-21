import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { TestCatalogManager } from './TestCatalogManager';
import { pathologyService, LabConfiguration } from '../services/pathologyService';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import { ReportLetterheadConfig } from './ReportLetterheadConfig';

export const PathologySettingsTab: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<LabConfiguration>({
    autoBillOnOrder: false,
    defaultReportHeaderBlob: '',
    defaultReportFooterText: '',
  });

  useEffect(() => {
    const fetchConfig = async () => {
      if (!hospitalId) return;
      try {
        setLoading(true);
        const data = await pathologyService.getLabConfig(hospitalId);
        setConfig({
          configId: data.configId,
          hospitalId: data.hospitalId,
          autoBillOnOrder: data.autoBillOnOrder ?? false,
          defaultReportHeaderBlob: data.defaultReportHeaderBlob ?? '',
          defaultReportFooterText: data.defaultReportFooterText ?? '',
        });
      } catch (error) {
        console.error('Failed to load lab config:', error);
        toast.error('Error', { description: 'Failed to load lab configuration.' });
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [hospitalId]);

  const handleSave = async () => {
    if (!hospitalId) return;
    setSaving(true);
    try {
      await pathologyService.updateLabConfig(hospitalId, {
        autoBillOnOrder: config.autoBillOnOrder,
        defaultReportHeaderBlob: config.defaultReportHeaderBlob,
        defaultReportFooterText: config.defaultReportFooterText,
      });
      toast.success('Saved', { description: 'Lab configuration updated successfully.' });
    } catch (error) {
      console.error('Failed to save lab config:', error);
      toast.error('Error', { description: 'Failed to save lab configuration.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Lab Configuration Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Lab Configuration</CardTitle>
          <CardDescription>
            General settings for the pathology lab module.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Auto Bill Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="autoBillOnOrder" className="text-base font-medium">Auto-bill on order</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create billing charge events when a lab order is placed.
                  </p>
                </div>
                <Switch
                  id="autoBillOnOrder"
                  checked={config.autoBillOnOrder}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, autoBillOnOrder: checked }))
                  }
                />
              </div>



              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Letterhead Designer */}
      <Card>
        <CardHeader>
          <CardTitle>Report Letterhead Designer</CardTitle>
          <CardDescription>
            Design and configure letterheads for your pathology reports. You can create multiple templates and set a default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportLetterheadConfig />
        </CardContent>
      </Card>

      {/* Test Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>Test Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Manage your pathology test master list, normal ranges, and pricing linkage here.
          </p>
          <TestCatalogManager />
        </CardContent>
      </Card>

    </div>
  );
};
