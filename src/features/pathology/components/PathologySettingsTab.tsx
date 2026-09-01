import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TestCatalogManager } from './TestCatalogManager';
import { ReportLetterheadConfig } from './ReportLetterheadConfig';

export const PathologySettingsTab: React.FC = () => {
  return (
    <div className="space-y-6">
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
