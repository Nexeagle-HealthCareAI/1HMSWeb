import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

interface TokenPrintModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tokenData: {
        tokenNumber: string;
        patientName: string;
        patientId: string;
        doctorName: string;
        appointmentDate: string;
        department?: string;
    } | null;
}

export const TokenPrintModal: React.FC<TokenPrintModalProps> = ({
    open,
    onOpenChange,
    tokenData
}) => {
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        onAfterPrint: () => onOpenChange(false),
    });

    if (!tokenData) return null;

    // Generate encoded data for URL
    const tokenPayload = {
        tn: tokenData.tokenNumber,
        pn: tokenData.patientName,
        pid: tokenData.patientId,
        dn: tokenData.doctorName,
        d: tokenData.department,
        ad: tokenData.appointmentDate
    };

    const encodedData = btoa(JSON.stringify(tokenPayload));
    // Use window.location.origin if available, otherwise fallback to root
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const qrUrl = `${baseUrl}/token-view?data=${encodedData}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Print Token</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-md border border-gray-200 overflow-auto max-h-[80vh]">
                    {/* Print Preview Area */}
                    <div className="flex justify-center w-full">
                        <div
                            ref={componentRef}
                            className="bg-white p-2 flex flex-col items-center text-center shadow-sm print:shadow-none print:w-full print:m-0 print:py-0 print:pl-4"
                            style={{
                                width: '80mm', // Standard thermal paper width
                                minHeight: '100px', // Allow content to dictate height
                                fontFamily: 'Arial, Helvetica, sans-serif', // Clean sans-serif for thermal
                                color: 'black',
                            }}
                        >
                            <style type="text/css" media="print">
                                {`
                                    @page {
                                        size: 80mm auto;
                                        margin: 0;
                                    }
                                    body {
                                        margin: 0;
                                        padding: 0;
                                        -webkit-print-color-adjust: exact;
                                    }
                                `}
                            </style>

                            {/* Header Removed */}

                            {/* Token Number */}
                            <div className="mt-8 mb-2">
                                <div className="text-sm font-bold uppercase">Token Number</div>
                                <div className="text-6xl font-black my-1 leading-none">{tokenData.tokenNumber}</div>
                            </div>

                            {/* Details */}
                            <div className="w-full text-left space-y-1.5 mb-4 border-t-2 border-dashed border-black pt-3 mt-2 pl-4">
                                <div className="flex justify-between items-baseline">
                                    <span className="font-bold text-xs">Date:</span>
                                    <span className="text-sm font-mono">{format(new Date(tokenData.appointmentDate), 'dd MMM, yyyy')}</span>
                                </div>

                                <div>
                                    <span className="font-bold block text-[10px] uppercase text-gray-600">Patient Details</span>
                                    <div className="text-sm font-bold truncate">{tokenData.patientName}</div>
                                    <div className="text-xs font-mono font-bold bg-gray-200 print:bg-gray-200 px-1 inline-block mt-0.5 rounded">{tokenData.patientId}</div>
                                </div>

                                <div>
                                    <span className="font-bold block text-[10px] uppercase text-gray-600">Doctor</span>
                                    <div className="text-sm font-bold truncate">{tokenData.doctorName}</div>
                                    {tokenData.department && (
                                        <div className="text-xs">{tokenData.department}</div>
                                    )}
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="mt-2 flex flex-col items-center w-full border-t-2 border-black pt-3">
                                <QRCodeSVG
                                    value={qrUrl}
                                    size={100} // Optimal size for verify scan
                                    level="M"
                                    includeMargin={false}
                                />
                                <div className="text-[10px] uppercase font-bold mt-1">Scan for Status</div>
                            </div>

                            {/* Footer */}
                            <div className="text-[10px] mt-3 font-semibold text-center w-full">
                                Please wait for your turn.
                            </div>
                            <div className="text-[11px] mt-1 text-center w-full">
                                {format(new Date(), 'dd/MM/yyyy HH:mm')}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>

                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="h-4 w-4" />
                        Print Token
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
