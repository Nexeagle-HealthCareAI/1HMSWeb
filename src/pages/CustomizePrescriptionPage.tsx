import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PrescriptionCustomizePanel from '@/components/prescription/PrescriptionCustomizePanel';

export const CustomizePrescriptionPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customize Prescription</h1>
              <p className="text-base text-gray-500 mt-1">Configure prescription templates and settings for better workflow efficiency</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Prescription Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PrescriptionCustomizePanel showCloseButton={false} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomizePrescriptionPage;

