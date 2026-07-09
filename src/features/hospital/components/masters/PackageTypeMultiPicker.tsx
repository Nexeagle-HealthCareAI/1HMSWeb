import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { packageTypeApi, PackageTypeItem } from '@/features/hospital/services/packageTypeApi';

interface Props {
    hospitalId: string;
    value: string[];
    onChange: (packageTypeIds: string[]) => void;
    label?: string | null;
}

const ADD_NEW = '__ADD_NEW__';

/** Multi-select variant of PackageTypePicker: an OT Plan can offer several Package Types
 *  (e.g. both "Full Package" and "Non Package"). Selected ones show as removable chips;
 *  the Select adds more (excluding already-picked) or opens the same inline "+ Add new" form. */
export const PackageTypeMultiPicker: React.FC<Props> = ({ hospitalId, value, onChange, label = 'Package Types (optional)' }) => {
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

    const selected = packageTypes.filter(pt => value.includes(pt.packageTypeId));
    const available = packageTypes.filter(pt => !value.includes(pt.packageTypeId));

    const handleSelectChange = (v: string) => {
        if (v === ADD_NEW) {
            setAdding(true);
            return;
        }
        if (!value.includes(v)) onChange([...value, v]);
    };

    const handleRemove = (packageTypeId: string) => {
        onChange(value.filter(id => id !== packageTypeId));
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
            onChange([...value, res.packageTypeId]);
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
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selected.map(pt => (
                        <Badge key={pt.packageTypeId} variant="outline" className="gap-1 pr-1 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800 font-normal">
                            {pt.name}{pt.price != null ? ` — ₹${pt.price.toLocaleString('en-IN')}` : ''}
                            <button type="button" onClick={() => handleRemove(pt.packageTypeId)} className="ml-0.5 rounded-full hover:bg-brand-200/60 dark:hover:bg-brand-800/60 p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            <Select value="" onValueChange={handleSelectChange}>
                <SelectTrigger><SelectValue placeholder={selected.length ? 'Add another package type…' : 'Pick package types, or leave blank'} /></SelectTrigger>
                <SelectContent>
                    {available.map(pt => (
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

export default PackageTypeMultiPicker;
