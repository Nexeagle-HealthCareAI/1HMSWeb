import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { pathologyService, PathologyReportVerificationResponse } from '../services/pathologyService';
import { AlertCircle, CheckCircle2, FlaskConical, Loader2 } from 'lucide-react';

// Mirrors PrescriptionVerificationPage's shape (public, no layout chrome, no auth) -- what the QR
// code embedded in a signed pathology report's PDF actually points at.
const PathologyReportVerificationPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [searchParams] = useSearchParams();
  const hashFromUrl = searchParams.get('hash') ?? undefined;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PathologyReportVerificationResponse | null>(null);
  const [manualHash, setManualHash] = useState('');
  const [checkingManualHash, setCheckingManualHash] = useState(false);

  const runVerify = async (hash?: string) => {
    if (!reportId) return;
    try {
      const response = await pathologyService.verifyReport(reportId, hash);
      setResult(response);
    } catch {
      setResult({ isAuthentic: false, message: 'Unable to verify this report right now. Please try again shortly.' });
    }
  };

  useEffect(() => {
    setLoading(true);
    runVerify(hashFromUrl).finally(() => setLoading(false));
  }, [reportId, hashFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualHashCheck = async () => {
    if (!manualHash.trim()) return;
    setCheckingManualHash(true);
    await runVerify(manualHash.trim());
    setCheckingManualHash(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Verifying report...</p>
      </div>
    );
  }

  const isAuthentic = result?.isAuthentic ?? false;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${isAuthentic ? 'bg-green-100' : 'bg-red-100'}`}>
          {isAuthentic ? (
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          ) : (
            <AlertCircle className="h-8 w-8 text-red-600" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isAuthentic ? 'Genuine Report' : 'Could Not Verify'}
        </h1>
        <p className="text-gray-500 mb-6">{result?.message}</p>

        {isAuthentic && (
          <div className="text-left bg-gray-50 rounded-md p-4 space-y-2 text-sm mb-6">
            <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
              <FlaskConical className="h-4 w-4" /> {result?.hospitalName ?? 'Hospital'}
            </div>
            {result?.reportNo && (
              <div className="flex justify-between"><span className="text-gray-500">Report No</span><span className="font-medium text-gray-900">{result.reportNo}</span></div>
            )}
            {result?.approvedAt && (
              <div className="flex justify-between"><span className="text-gray-500">Approved</span><span className="font-medium text-gray-900">{new Date(result.approvedAt).toLocaleString()}</span></div>
            )}
            {result?.technicianName && (
              <div className="flex justify-between"><span className="text-gray-500">Technician</span><span className="font-medium text-gray-900">{result.technicianName}</span></div>
            )}
            {result?.pathologistName && (
              <div className="flex justify-between"><span className="text-gray-500">Pathologist</span><span className="font-medium text-gray-900">{result.pathologistName}</span></div>
            )}
          </div>
        )}

        {!hashFromUrl && (
          <div className="text-left border-t pt-4 mt-2">
            <label className="text-xs text-gray-500 mb-1 block">
              For a stricter check, enter the Document Hash printed on the report
            </label>
            <div className="flex gap-2">
              <input
                value={manualHash}
                onChange={(e) => setManualHash(e.target.value)}
                placeholder="Document hash"
                className="flex-1 border rounded-md px-3 py-2 text-sm"
              />
              <button
                onClick={handleManualHashCheck}
                disabled={checkingManualHash || !manualHash.trim()}
                className="px-3 py-2 text-sm rounded-md bg-teal-600 text-white disabled:opacity-50"
              >
                {checkingManualHash ? 'Checking...' : 'Check'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PathologyReportVerificationPage;
