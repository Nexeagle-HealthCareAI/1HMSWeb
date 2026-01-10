import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Barcode from 'react-barcode';
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Print Token</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-md border border-gray-200">
                    {/* Print Preview Area */}
                    <div
                        ref={componentRef}
                        className="bg-white p-4 w-[80mm] min-h-[100mm] flex flex-col items-center text-center shadow-sm print:shadow-none"
                        style={{
                            fontFamily: 'monospace',
                            width: '80mm', // Standard thermal paper width
                            padding: '5mm',
                        }}
                    >

                        <div className="text-lg font-bold mb-1">TOKEN NO</div>
                        <div className="text-4xl font-black mb-4">{tokenData.tokenNumber}</div>

                        <div className="w-full text-left space-y-2 mb-4">
                            <div>
                                <span className="font-semibold block text-xs">PATIENT ID:</span>
                                <span className="text-sm">{tokenData.patientId}</span>
                            </div>
                            <div className="truncate">
                                <span className="font-semibold block text-xs">PATIENT:</span>
                                <span className="text-sm font-bold">{tokenData.patientName}</span>
                            </div>
                            <div className="truncate">
                                <span className="font-semibold block text-xs">DOCTOR:</span>
                                <span className="text-sm">{tokenData.doctorName}</span>
                            </div>
                            {tokenData.department && (
                                <div className="truncate">
                                    <span className="font-semibold block text-xs">DEPT:</span>
                                    <span className="text-sm">{tokenData.department}</span>
                                </div>
                            )}
                            <div>
                                <span className="font-semibold block text-xs">APPOINTMENT DATE:</span>
                                <span className="text-sm">{format(new Date(tokenData.appointmentDate), 'dd-MM-yyyy')}</span>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 flex flex-col items-center">
                            <Barcode
                                value={tokenData.patientId}
                                width={1.5}
                                height={40}
                                fontSize={12}
                                displayValue={false}
                            />
                            <div className="text-xs mt-1">{tokenData.patientId}</div>
                        </div>

                        <div className="text-[10px] mt-4">
                            Please wait for your turn.
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
