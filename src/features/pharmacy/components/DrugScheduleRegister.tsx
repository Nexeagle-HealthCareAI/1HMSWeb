import React, { useEffect, useState } from 'react';
import { inventoryApi, DrugScheduleRegisterEntryItem } from '@/features/ipd-redesign/services/inventoryApi';
import { useAuthStore } from '@/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export const DrugScheduleRegister: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [entries, setEntries] = useState<DrugScheduleRegisterEntryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    setIsLoading(true);
    inventoryApi.getScheduleRegister({ scheduleClass: 'H1' }, hospitalId)
      .then(setEntries)
      .catch(() => toast.error('Could not load the Schedule H1 register'))
      .finally(() => setIsLoading(false));
  }, [hospitalId]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2 text-slate-700">
        <ShieldAlert className="h-5 w-5" />
        <h2 className="font-semibold text-lg">Schedule H1 Register</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Statutory log of every Schedule H1 dispense — recorded automatically at checkout, immutable.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No Schedule H1 dispenses recorded yet.</div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Prescriber</TableHead>
                <TableHead>Dispensed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(e => (
                <TableRow key={e.registerEntryId}>
                  <TableCell className="text-xs">{new Date(e.recordedAt).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="font-medium">{e.itemName}</TableCell>
                  <TableCell className="font-mono text-xs">{e.batchNumber}</TableCell>
                  <TableCell>{e.storeName}</TableCell>
                  <TableCell>{e.qty}</TableCell>
                  <TableCell>{e.patientId ?? '—'}</TableCell>
                  <TableCell>{e.prescriberRef ?? '—'}</TableCell>
                  <TableCell>{e.dispensedBy ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
