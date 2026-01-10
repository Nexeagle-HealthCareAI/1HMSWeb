import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientProfileApi } from '../services/patientProfileApi';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';

const PrescriptionVerificationPage: React.FC = () => {
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrescription = async () => {
            if (!appointmentId) {
                setError('Invalid appointment link.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // Using the new API method to get the signed PDF URL
                const response = await patientProfileApi.getVisitSummary(appointmentId);

                if (response.success && response.pdfUrl) {
                    setPdfUrl(response.pdfUrl);
                    setError(null);
                } else {
                    // If success is false OR pdfUrl is null, treat as distinct errors if possible
                    // User: "if pdfUrl is null then ... display No Prescription Available"
                    setError(response.message || 'No Prescription Available');
                    setPdfUrl(null);
                }
            } catch (err) {
                console.error('Verification error', err);
                setError('Unable to verify prescription at this time.');
            } finally {
                setLoading(false);
            }
        };

        fetchPrescription();
    }, [appointmentId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="h-8 w-8 text-teal-600 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Verifying Prescription...</p>
            </div>
        );
    }

    if (error || !pdfUrl) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Prescription Not Found</h1>
                    <p className="text-gray-500 mb-6">
                        {error || 'The prescription you are looking for is not available or has not been generated yet.'}
                    </p>
                    <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                        <p className="text-xs text-gray-400">Reference: {appointmentId}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-teal-600 p-1.5 rounded text-white">
                        <FileText className="h-5 w-5" />
                    </div>
                    <h1 className="font-semibold text-gray-900">Verified Prescription</h1>
                </div>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium border border-green-200">
                    Valid Signature
                </span>
            </div>
            <div className="flex-1 w-full h-full p-4 overflow-hidden">
                <iframe
                    src={pdfUrl}
                    className="w-full h-[calc(100vh-80px)] rounded-lg shadow-sm border border-gray-300 bg-white"
                    title="Prescription PDF"
                />
            </div>
        </div>
    );
};

export default PrescriptionVerificationPage;
