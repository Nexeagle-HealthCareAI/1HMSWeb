import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { packageTypeApi, PackageTypeItem } from '@/features/hospital/services/packageTypeApi';

interface Props {
    hospitalId: string;
    value?: string | null;
    onChange: (packageTypeId: string | null) => void;
    label?: string | null;
}

const NONE = 'NONE';
const ADD_NEW = '__ADD_NEW__';

/** Shared package-type picker: a Select of active package types plus an inline
 *  "+ Add new package type…" mini-form. Used identically in the OT Plan editor and
 *  Advise Admission, so a doctor-created entry is immediately visible in both places. */
export const PackageTypePicker: React.FC<Props> = ({ hospitalId, value, onChange, label = 'Package Type (optional)' }) => {
    const [packageTypes, setPackageTypes] = useState<PackageTypeItem[]>([]);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newComponents, setNewComponents] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchPackageTypes = async () => {
        if (!hospitalId) return;
        try {
            const res = await packageTypeApi.list({ hospitalId });
            setPackageTypes(res?.packageTypes ?? []);
        } catch {
            setPackageTypes([]);
        }
    };

    useEffect(() => { fetchPackageTypes(); }, [hospitalId]);

    const handleSelectChange = (v: string) => {
        if (v === ADD_NEW) {
            setAdding(true);
            return;
        }
        onChange(v === NONE ? null : v);
    };

    const handleCancelAdd = () => {
        setAdding(false);
        setNewName(''); setNewPrice(''); setNewComponents('');
    };

    const handleSaveNew = async () => {
        if (!newName.trim()) {
            toast({ title: 'Name required', description: 'Enter a package type name.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const components = newComponents.split(',').map(c => c.trim()).filter(Boolean);
            const res = await packageTypeApi.upsert({
                hospitalId,
                name: newName.trim(),
                price: newPrice.trim() ? Number(newPrice) : null,
                components,
                isActive: true,
            });
            if (!res?.success || !res.packageTypeId) throw new Error(res?.message ?? 'Could not save package type');

            await fetchPackageTypes();
            onChange(res.packageTypeId);
            handleCancelAdd();
            toast({ title: 'Package type added', description: `"${newName.trim()}" is now available.` });
        } catch (e: any) {
            toast({ title: 'Could not save package type', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    if (adding) {
        return (
            <div className="grid gap-2 p-3 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-950/20">
                <Label className="text-xs font-semibold text-brand-700 dark:text-brand-300">New package type</Label>
                <Input placeholder="Name, e.g. Full Package" value={newName} onChange={e => setNewName(e.target.value)} />
                <Input type="number" placeholder="Price (optional)" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
                <Input
                    placeholder="Components, comma separated (optional) — e.g. OT Med, Ward Med, Room Rent"
                    value={newComponents}
                    onChange={e => setNewComponents(e.target.value)}
                />
                <div className="flex justify-end gap-2 mt-1">
                    <Button variant="ghost" size="sm" onClick={handleCancelAdd} disabled={saving}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveNew} disabled={saving} className="gap-1.5 bg-brand-600 hover:bg-brand-700">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Save
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-2">
            {label && <Label>{label}</Label>}
            <Select value={value || NONE} onValueChange={handleSelectChange}>
                <SelectTrigger><SelectValue placeholder="Pick a package type, or leave blank" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value={NONE}>No package type</SelectItem>
                    {packageTypes.map(pt => (
                        <SelectItem key={pt.packageTypeId} value={pt.packageTypeId}>
                            {pt.name}{pt.price != null ? ` — ₹${pt.price.toLocaleString('en-IN')}` : ''}
                        </SelectItem>
                    ))}
                    <SelectItem value={ADD_NEW} className="text-brand-600 dark:text-brand-400 font-medium">
                        + Add new package type…
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
};

export default PackageTypePicker;
