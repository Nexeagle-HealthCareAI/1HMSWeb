import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface SignatureDebugInfoProps {
  settings: any;
  assets: any[];
  onRefresh: () => void;
}

export const SignatureDebugInfo: React.FC<SignatureDebugInfoProps> = ({
  settings,
  assets,
  onRefresh
}) => {
  const getAssetByType = (type: string) => {
    return assets?.find(asset => asset.assetType === type)?.blobUrl;
  };

  const getAssetByTypeFull = (type: string) => {
    return assets?.find(asset => asset.assetType === type);
  };

  const signatureAsset = getAssetByTypeFull('signature_image');
  const signatureUrl = settings.images?.signature || getAssetByType('signature_image');

  const debugInfo = {
    useDoctorSetting: settings.useDoctorSetting,
    useLetterhead: settings.useLetterhead,
    showSignature: settings.footer?.showSignature,
    signatureUrl: signatureUrl,
    signatureAsset: signatureAsset,
    doctorName: settings.footer?.doctorName,
    signatureWidth: settings.footer?.signatureWidth,
    signatureHeight: settings.footer?.signatureHeight,
  };

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (condition: boolean, trueText: string, falseText: string) => {
    return (
      <Badge variant={condition ? "default" : "destructive"}>
        {condition ? trueText : falseText}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Signature Debug Info
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-7 px-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Settings Status */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700">Settings Status</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span>Doctor Settings:</span>
              {getStatusIcon(debugInfo.useDoctorSetting)}
            </div>
            <div className="flex items-center justify-between">
              <span>Letterhead:</span>
              {getStatusIcon(debugInfo.useLetterhead)}
            </div>
            <div className="flex items-center justify-between">
              <span>Show Signature:</span>
              {getStatusIcon(debugInfo.showSignature)}
            </div>
            <div className="flex items-center justify-between">
              <span>Doctor Name:</span>
              {getStatusIcon(!!debugInfo.doctorName)}
            </div>
          </div>
        </div>

        {/* Signature Asset Info */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700">Signature Asset</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span>Asset Found:</span>
              {getStatusIcon(!!debugInfo.signatureAsset)}
            </div>
            <div className="flex items-center justify-between">
              <span>URL Available:</span>
              {getStatusIcon(!!debugInfo.signatureUrl)}
            </div>
            {debugInfo.signatureAsset && (
              <>
                <div className="flex items-center justify-between">
                  <span>Asset ID:</span>
                  <span className="text-gray-600">{debugInfo.signatureAsset.prescriptionAssestId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Blob ID:</span>
                  <span className="text-gray-600">{debugInfo.signatureAsset.blobAssetId}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Signature Dimensions */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700">Dimensions</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span>Width:</span>
              <span className="text-gray-600">{debugInfo.signatureWidth || 20}mm</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Height:</span>
              <span className="text-gray-600">{debugInfo.signatureHeight || 10}mm</span>
            </div>
          </div>
        </div>

        {/* Display Logic */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700">Display Logic</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span>Will Show Signature:</span>
              {getStatusIcon(
                debugInfo.showSignature || 
                (debugInfo.useDoctorSetting && !!debugInfo.signatureUrl)
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Conditions Met:</span>
              {getStatusBadge(
                (debugInfo.showSignature || debugInfo.useDoctorSetting) && 
                !debugInfo.useLetterhead,
                "Yes",
                "No"
              )}
            </div>
          </div>
        </div>

        {/* Raw Data */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700">Raw Data</h4>
          <div className="bg-gray-50 p-2 rounded text-xs font-mono overflow-x-auto">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
