import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ePrescriptionApi, MedicationModel } from '../services/ePrescriptionApi';
import { inventoryApi, InventoryItem } from '@/features/ipd-redesign/services/inventoryApi';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface MappedPrescriptionItem {
  medication: MedicationModel;
  matchedInventoryItem?: InventoryItem;
  qtyToDispense: number;
}

interface LoadEPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalId: string;
  onLoadCart: (items: MappedPrescriptionItem[], patientId: string) => void;
}

export const LoadEPrescriptionModal: React.FC<LoadEPrescriptionModalProps> = ({ isOpen, onClose, hospitalId, onLoadCart }) => {
  const [appointmentId, setAppointmentId] = useState('');
  const [patientId, setPatientId] = useState('');
  // In a real app, doctorId might be fetched from the appointment or entered.
  // For this prototype, we'll use a dummy ID or make it optional.
  const [doctorId, setDoctorId] = useState('00000000-0000-0000-0000-000000000000');
  
  const [isLoading, setIsLoading] = useState(false);
  const [mappedItems, setMappedItems] = useState<MappedPrescriptionItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!appointmentId.trim() || !patientId.trim()) {
      toast.error('Please enter both Appointment ID and Patient ID');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      // 1. Fetch prescription details
      const response = await ePrescriptionApi.getPrescriptionDetails(hospitalId, appointmentId, patientId, doctorId);
      
      if (!response.success || !response.data?.medications) {
        toast.error('Could not load prescription details.');
        setMappedItems([]);
        return;
      }

      // 2. Fetch inventory master for matching
      // Note: Ideally, there would be a more optimized auto-match endpoint. For now, we do a client-side text match.
      const inventory = await inventoryApi.getItems({}, hospitalId);
      
      // 3. Auto-match logic
      const mapped = response.data.medications.map(med => {
        // Attempt to find an item where the inventory name or generic name loosely matches the prescribed drug name
        const match = inventory.find(inv => {
           const invName = inv.itemName?.toLowerCase() || '';
           const genName = inv.genericName?.toLowerCase() || '';
           const drugName = med.drugName?.toLowerCase() || '';
           return (drugName && invName.includes(drugName)) || (drugName && genName.includes(drugName));
        });

        // Try to parse frequency and duration into a QTY, e.g. "BID" * "5 days" = 10
        // A simple heuristic for prototype purposes: default to 1 if we can't parse it easily.
        let estimatedQty = 1;

        return {
          medication: med,
          matchedInventoryItem: match,
          qtyToDispense: estimatedQty
        };
      });

      setMappedItems(mapped);

    } catch (error) {
      toast.error('Failed to fetch e-prescription.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    onLoadCart(mappedItems, patientId);
    onClose();
    // Reset state
    setMappedItems([]);
    setAppointmentId('');
    setPatientId('');
    setHasSearched(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Load e-Prescription</DialogTitle>
          <DialogDescription>
            Enter Patient details to fetch their latest e-Prescription and auto-populate the POS cart.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end space-x-4 mb-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500">Patient ID</label>
            <Input 
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              placeholder="e.g. PAT-1001"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500">Appointment ID</label>
            <Input 
              value={appointmentId}
              onChange={e => setAppointmentId(e.target.value)}
              placeholder="UUID"
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Fetch
          </Button>
        </div>

        {hasSearched && (
          <div className="border rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Prescribed Drug</TableHead>
                  <TableHead>Dosage/Freq</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Matched Inventory Item</TableHead>
                  <TableHead>Match Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedItems.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No medications found on this prescription.
                    </TableCell>
                  </TableRow>
                )}
                {mappedItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.medication.drugName}</TableCell>
                    <TableCell>{item.medication.dose} / {item.medication.frequency}</TableCell>
                    <TableCell>{item.medication.duration}</TableCell>
                    <TableCell>
                      {item.matchedInventoryItem ? (
                        <div>
                           <div>{item.matchedInventoryItem.itemName}</div>
                           <div className="text-xs text-gray-500">{item.matchedInventoryItem.itemCode}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No match found</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.matchedInventoryItem ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Matched
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-600">
                          <AlertCircle className="h-4 w-4 mr-1" /> Manual Mapping Required
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!hasSearched || mappedItems.length === 0}>
            Load into Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
