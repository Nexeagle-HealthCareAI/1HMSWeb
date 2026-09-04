import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import { pathologyService, PathologyExternalLab } from '../services/pathologyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Plus, Edit2, Building2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type EditingLab = Partial<PathologyExternalLab>;

interface ExternalLabsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Simple master for the labs a pathology test can be routed to when outsourced (see
// TestCatalogForm's "This test is processed by an external lab" toggle). One sheet, list + inline
// edit form -- this master is small (a handful of partner labs per hospital), doesn't need the
// full card-grid treatment VendorMaster uses for procurement's much larger vendor list.
export const ExternalLabsManager: React.FC<ExternalLabsManagerProps> = ({ isOpen, onClose }) => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [labs, setLabs] = useState<PathologyExternalLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingLab | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchLabs = async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      setLabs(await pathologyService.getExternalLabs(hospitalId, true));
    } catch {
      toast.error('Could not load external labs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchLabs();
    if (!isOpen) setEditing(null);
  }, [isOpen, hospitalId]);

  const handleSave = async () => {
    if (!hospitalId || !editing?.labName?.trim()) {
      toast.error('Lab name is required');
      return;
    }
    setIsSaving(true);
    try {
      const res = await pathologyService.upsertExternalLab(hospitalId, {
        externalLabId: editing.externalLabId,
        labName: editing.labName.trim(),
        contactPerson: editing.contactPerson,
        phone: editing.phone,
        email: editing.email,
        address: editing.address,
        accreditationNo: editing.accreditationNo,
        isActive: editing.isActive ?? true,
      });
      if (!res.success) throw new Error(res.message);
      toast.success(editing.externalLabId ? 'Lab updated' : 'Lab added');
      setEditing(null);
      await fetchLabs();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save external lab');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {editing && (
              <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={() => setEditing(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            External Labs
          </SheetTitle>
        </SheetHeader>

        {editing ? (
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Lab Name *</Label>
              <Input value={editing.labName ?? ''} onChange={(e) => setEditing(p => ({ ...p, labName: e.target.value }))} placeholder="e.g. Metro Diagnostics" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={editing.contactPerson ?? ''} onChange={(e) => setEditing(p => ({ ...p, contactPerson: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editing.phone ?? ''} onChange={(e) => setEditing(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editing.email ?? ''} onChange={(e) => setEditing(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Accreditation No. (NABL etc.)</Label>
                <Input value={editing.accreditationNo ?? ''} onChange={(e) => setEditing(p => ({ ...p, accreditationNo: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input value={editing.address ?? ''} onChange={(e) => setEditing(p => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch checked={editing.isActive ?? true} onCheckedChange={(v) => setEditing(p => ({ ...p, isActive: v }))} />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <Button size="sm" onClick={() => setEditing({ isActive: true })}>
              <Plus className="h-4 w-4 mr-2" /> Add External Lab
            </Button>
            {loading ? (
              <div className="py-10"><LoadingSpinner /></div>
            ) : labs.length === 0 ? (
              <div className="text-center p-8 border-2 border-dashed rounded-lg text-gray-500 text-sm">
                No external labs configured yet.
              </div>
            ) : (
              <div className="border rounded-md divide-y bg-white dark:bg-slate-900">
                {labs.map(l => (
                  <div key={l.externalLabId} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{l.labName}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {[l.contactPerson, l.phone].filter(Boolean).join(' · ') || '-'}
                        </div>
                      </div>
                      {!l.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">Inactive</span>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setEditing(l)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ExternalLabsManager;
