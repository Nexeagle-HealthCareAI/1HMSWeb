import React, { useState, useEffect } from 'react';
import { visitTypeLabel } from '../utils/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    FileText, Save, Search, Plus, Edit, Copy, Trash, ArrowLeft, ArrowUpDown, X, HelpCircle, Filter, Package
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { billingService, ChargeItemRequest, ChargeItem } from '../services/billingService';
import { useToast } from '@/hooks/use-toast';




// Validation for a charge-master row. Mandatory: name, rate (>= 0), qty (>= 1).
// Visit type / category / charge type always carry a default, so they can't be blank.
const fieldErrors = (it: { displayName?: string; defaultRate?: string | number; defaultQty?: string | number; defaultDiscountPercent?: string | number } | null) => {
    const e: { displayName?: string; defaultRate?: string; defaultQty?: string; defaultDiscountPercent?: string } = {};
    if (!it) return e;
    if (!String(it.displayName ?? '').trim()) e.displayName = 'Display name is required';

    const r = it.defaultRate;
    const rate = Number(r);
    if (r === '' || r === null || r === undefined || isNaN(rate) || rate < 0) e.defaultRate = 'Enter a valid rate (0 or more)';

    const q = it.defaultQty;
    const qty = Number(q);
    if (q === '' || q === null || q === undefined || isNaN(qty) || qty < 1) e.defaultQty = 'Quantity must be at least 1';

    const d = it.defaultDiscountPercent;
    if (d !== '' && d !== null && d !== undefined) {
        const disc = Number(d);
        if (isNaN(disc) || disc < 0 || disc > 100) e.defaultDiscountPercent = 'Discount must be between 0 and 100';
    }
    return e;
};

const ChargeCatalog: React.FC = () => {
    const [items, setItems] = useState<ChargeItem[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddItemDialog, setShowAddItemDialog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [itemToDelete, setItemToDelete] = useState<ChargeItem | null>(null);
    const { toast } = useToast();
    // Use a partial type that allows strings for numeric fields during editing
    const [tempItem, setTempItem] = useState<(Omit<ChargeItem, 'defaultRate' | 'defaultDiscountPercent' | 'defaultQty'> & { defaultRate: string | number; defaultDiscountPercent: string | number; defaultQty: string | number }) | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterVisitType, setFilterVisitType] = useState<string>('ALL');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [filterChargeType, setFilterChargeType] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const [sortConfig, setSortConfig] = useState<{ key: keyof ChargeItem, direction: 'asc' | 'desc' } | null>(null);

    // Fetch charge items from API
    const fetchChargeItems = async () => {
        try {
            const response = await billingService.getChargeItems();
            if (response.success && response.data) {
                setItems(response.data);
            }
        } catch (error) {
            console.error('Error fetching charge items:', error);
            toast({
                title: "Error",
                description: "Failed to load charge items",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch items on mount
    useEffect(() => {
        fetchChargeItems();
    }, []);

    const handleEdit = (item: ChargeItem) => {
        setEditingId(item.chargeItemId);
        setTempItem({ ...item });
    };

    const handleCancel = () => {
        if (editingId && editingId.startsWith('new_')) {
            setItems(items.filter(i => i.chargeItemId !== editingId));
        }
        setEditingId(null);
        setTempItem(null);
        setShowAddItemDialog(false);
    };

    const handleSave = async () => {
        if (tempItem) {
            const errs = fieldErrors(tempItem);
            const firstErr = errs.displayName || errs.defaultRate || errs.defaultQty || errs.defaultDiscountPercent;
            if (firstErr) {
                toast({
                    title: "Validation Error",
                    description: firstErr,
                    variant: "destructive",
                });
                return;
            }

            // Prepare API payload
            const chargeData: ChargeItemRequest = {
                displayName: tempItem.displayName,
                visitType: tempItem.visitType as any,
                category: tempItem.category as any,
                chargeType: tempItem.chargeType as any,
                defaultQty: Number(tempItem.defaultQty),
                defaultRate: Number(tempItem.defaultRate),
                defaultDiscountPercent: Number(tempItem.defaultDiscountPercent),
                // Include chargeItemId if it's an existing item (not starting with new_)
                ...(!tempItem.chargeItemId.startsWith('new_') ? { chargeItemId: tempItem.chargeItemId } : {})
            };

            setIsSaving(true);

            try {
                // Call API - handles both Create and Update
                const response = await billingService.createChargeItem(chargeData);

                if (response.success) {
                    const isNew = tempItem.chargeItemId.startsWith('new_');
                    toast({
                        title: "Success!",
                        description: response.message || (isNew ? "Charge item created successfully" : "Charge item updated successfully"),
                    });

                    // Refresh the list from API
                    await fetchChargeItems();

                    // Reset form
                    setEditingId(null);
                    setTempItem(null);
                    setShowAddItemDialog(false);
                    // If created new, reset to page 1. If edit, stay on page.
                    if (isNew) setCurrentPage(1);
                } else {
                    toast({
                        title: "Error",
                        description: response.message || "Failed to save charge item",
                        variant: "destructive",
                    });
                }
            } catch (error: any) {
                console.error('Error saving charge item:', error);
                toast({
                    title: "Error",
                    description: error.message || "Failed to save charge item. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleDelete = (item: ChargeItem) => {
        setItemToDelete(item);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            const response = await billingService.deleteChargeItem(itemToDelete.chargeItemId);

            if (response.success) {
                toast({
                    title: "Success!",
                    description: response.message || "Charge item deleted successfully",
                });

                // Refresh the list from API
                await fetchChargeItems();
            } else {
                toast({
                    title: "Error",
                    description: response.message || "Failed to delete charge item",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            console.error('Error deleting charge item:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to delete charge item. Please try again.",
                variant: "destructive",
            });
        } finally {
            setItemToDelete(null);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1); // Reset to first page on search
    };

    const handleDuplicate = (item: ChargeItem) => {
        // TODO: Call create API with duplicated data
        const newItem: ChargeItem = {
            ...item,
            chargeItemId: Math.random().toString(36).substr(2, 9),
            displayName: `${item.displayName} (Copy)`,
            updatedAt: new Date().toISOString()
        };
        setItems([...items, newItem]);
    };

    const handleAddNew = () => {
        const newId = `new_${Math.random().toString(36).substr(2, 9)}`;
        const newItem: ChargeItem = {
            chargeItemId: newId,
            hospitalId: '',
            displayName: '',
            visitType: 'OPD',
            category: 'Consultation',
            chargeType: 'Service',
            defaultQty: 1,
            defaultRate: 0,
            defaultDiscountPercent: 0,
            isActive: true,
            sortOrder: 0,
            updatedAt: new Date().toISOString(),
            updatedBy: ''
        };
        setTempItem(newItem);
        setShowAddItemDialog(true);
    };

    const handleSort = (key: keyof ChargeItem) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedItems = React.useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const filteredItems = sortedItems.filter(item => {
        if (!item.displayName) return true; // Show empty items (newly created)
        const matchesSearch = item.displayName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesVisitType = filterVisitType === 'ALL' || item.visitType === filterVisitType;
        const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
        const matchesChargeType = filterChargeType === 'ALL' || item.chargeType === filterChargeType;
        return matchesSearch && matchesVisitType && matchesCategory && matchesChargeType;
    });

    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const updateTempItem = (field: keyof ChargeItem, value: any) => {
        if (!tempItem) return;

        if (field === 'defaultRate') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                if (numValue < 0) return;
            }
        }

        if (field === 'defaultDiscountPercent') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                if (numValue < 0 || numValue > 100) return;
            }
        }

        if (field === 'defaultQty') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                if (numValue < 0) return;
            }
        }

        setTempItem({ ...tempItem, [field]: value });
    };

    const SortIcon = ({ column }: { column: keyof ChargeItem }) => {
        if (sortConfig?.key !== column) return <div className="ml-2 h-4 w-4" />; // Maintain spacing but hide arrow
        return sortConfig.direction === 'asc' ?
            <ArrowUpDown className="ml-2 h-4 w-4 text-brand-600" /> :
            <ArrowUpDown className="ml-2 h-4 w-4 text-brand-600 rotate-180" />;
    };

    const getBadgeVariant = (type: ChargeItem['category']) => {
        switch (type) {
            case 'Consultation': return 'bg-brand-100 text-brand-700 hover:bg-brand-200 border-brand-200';
            case 'Laboratory': return 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200';
            case 'Radiology': return 'bg-brand-100 text-brand-700 hover:bg-brand-200 border-brand-200';
            case 'Procedures': return 'bg-teal-100 text-teal-700 hover:bg-teal-200 border-teal-200';
            case 'Admission':
            case 'Bed Charges': return 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200';
            case 'Nursing': return 'bg-pink-100 text-pink-700 hover:bg-pink-200 border-pink-200';
            case 'OT Charges': return 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200';
            case 'Vaccination': return 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200';
            case 'Physiotherapy': return 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-200';
            default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200';
        }
    };

    const errors = fieldErrors(tempItem);
    const isValid = Object.keys(errors).length === 0;

    return (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center shrink-0">
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="Search by item name..."
                            className="pl-10 h-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm"
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <div className="relative">
                        <Select value={filterVisitType} onValueChange={(val) => { setFilterVisitType(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value="ALL">All Categories</SelectItem>
                                {[
                                    'Consultation', 'Laboratory', 'Radiology', 'Procedures',
                                    'Admission', 'Bed Charges', 'Nursing', 'OT Charges',
                                    'Physiotherapy', 'Vaccination', 'Miscellaneous'
                                ].map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {filterVisitType !== 'ALL' && (
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-brand-600 text-white text-xs flex items-center justify-center rounded-full font-semibold">
                                1
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <Select value={filterCategory} onValueChange={(val) => { setFilterCategory(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value="ALL">All Categories</SelectItem>
                                {[
                                    'Consultation', 'Laboratory', 'Radiology', 'Procedures',
                                    'Admission', 'Bed Charges', 'Nursing', 'OT Charges',
                                    'Physiotherapy', 'Vaccination', 'Miscellaneous'
                                ].map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {filterCategory !== 'ALL' && (
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-brand-600 text-white text-xs flex items-center justify-center rounded-full font-semibold">
                                1
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative">
                        <Select value={filterChargeType} onValueChange={(val) => { setFilterChargeType(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm">
                                <SelectValue placeholder="Charge Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Charge Types</SelectItem>
                                {['Service', 'Product', 'Bed', 'Package', 'Procedure'].map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {filterChargeType !== 'ALL' && (
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-brand-600 text-white text-xs flex items-center justify-center rounded-full font-semibold">
                                1
                            </span>
                        )}
                    </div>
                    <Button onClick={handleAddNew} className="bg-brand-600 hover:bg-brand-700 shadow-md transition-all hover:shadow-lg h-11 px-6">
                        <Plus className="h-5 w-5 mr-2" /> Add Item
                    </Button>
                </div>
            </div>

            <div className="flex-1 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 overflow-hidden flex flex-col shadow-sm">
                <div className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 border-b border-gray-100 dark:border-gray-800">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="py-3 px-4 w-[40%] cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('displayName')}>
                                    <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Display Name <SortIcon column="displayName" />
                                    </div>
                                </TableHead>
                                <TableHead className="py-3 px-4 w-[12%] cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('visitType')}>
                                    <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Visit Type <SortIcon column="visitType" />
                                    </div>
                                </TableHead>
                                <TableHead className="py-3 px-4 w-[15%] cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('category')}>
                                    <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Category <SortIcon column="category" />
                                    </div>
                                </TableHead>
                                <TableHead className="py-3 px-4 w-[12%] cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('chargeType')}>
                                    <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Type <SortIcon column="chargeType" />
                                    </div>
                                </TableHead>
                                <TableHead className="py-3 px-4 text-right w-[15%] cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('defaultRate')}>
                                    <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Rate <SortIcon column="defaultRate" />
                                    </div>
                                </TableHead>
                                <TableHead className="py-3 px-4 text-right w-[15%] cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('defaultDiscountPercent')}>
                                    <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Discount Upto <SortIcon column="defaultDiscountPercent" />
                                    </div>
                                </TableHead>
                                <TableHead className="py-3 px-4 text-right w-[10%] cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('defaultQty')}>
                                    <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Qty <SortIcon column="defaultQty" />
                                    </div>
                                </TableHead>
                                <TableHead className="py-3 px-4 text-right w-[15%]">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Actions
                                    </div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                        Loading charge items...
                                    </TableCell>
                                </TableRow>
                            ) : currentItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                        No charge items found. Click "Add Item" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : currentItems.map((item, index) => {
                                const isEditing = editingId === item.chargeItemId;
                                return (
                                    <TableRow key={item.chargeItemId} className={`transition-all group ${isEditing ? 'bg-brand-50/50 dark:bg-brand-950/30 border-l-4 border-brand-600' :
                                        index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'
                                        } hover:bg-gray-100 dark:hover:bg-gray-800`}>
                                        <TableCell className="py-3 px-4 font-medium">
                                            {isEditing ? (
                                                <Input
                                                    value={tempItem?.displayName}
                                                    onChange={(e) => updateTempItem('displayName', e.target.value)}
                                                    placeholder="Item Name (Required)"
                                                    className={!tempItem?.displayName?.trim() ? "border-red-500" : ""}
                                                    autoFocus
                                                />
                                            ) : (
                                                item.displayName
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Select
                                                    value={tempItem?.visitType}
                                                    onValueChange={(val: any) => updateTempItem('visitType', val)}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['OPD', 'LAB', 'PHARMACY', 'IPD', 'ER', 'OTHER'].map(t => (
                                                            <SelectItem key={t} value={t}>{visitTypeLabel(t)}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge variant="outline" className="bg-brand-50 text-brand-700 border-brand-200">
                                                    {visitTypeLabel(item.visitType)}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Select
                                                    value={tempItem?.category}
                                                    onValueChange={(val: any) => updateTempItem('category', val)}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[200px]">
                                                        {[
                                                            'Consultation', 'Laboratory', 'Radiology', 'Procedures',
                                                            'Admission', 'Bed Charges', 'Nursing', 'OT Charges',
                                                            'Physiotherapy', 'Vaccination', 'Miscellaneous'
                                                        ].map(t => (
                                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge variant="outline" className={`${getBadgeVariant(item.category as any)} shadow-sm`}>
                                                    {item.category}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3 px-4 text-right font-bold text-gray-900 dark:text-gray-100">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={tempItem?.defaultRate}
                                                    onChange={(e) => updateTempItem('defaultRate', e.target.value)}
                                                    className={`text-right h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.defaultRate ? 'border-red-500' : ''}`}
                                                />
                                            ) : (
                                                `₹${item.defaultRate}`
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3 px-4 text-right font-bold text-gray-900 dark:text-gray-100">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={tempItem?.defaultDiscountPercent}
                                                    onChange={(e) => updateTempItem('defaultDiscountPercent', e.target.value)}
                                                    className="text-right h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            ) : (
                                                <span className={item.defaultDiscountPercent > 0 ? "text-green-600" : "text-gray-400"}>
                                                    {item.defaultDiscountPercent}%
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3 px-4 text-right font-bold text-gray-900 dark:text-gray-100">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={tempItem?.defaultQty}
                                                    onChange={(e) => updateTempItem('defaultQty', e.target.value)}
                                                    className={`text-right h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.defaultQty ? 'border-red-500' : ''}`}
                                                />
                                            ) : (
                                                item.defaultQty
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3 px-4 text-right">
                                            <TooltipProvider>
                                                <div className="flex justify-end gap-2">
                                                    {isEditing ? (
                                                        <>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="sm" onClick={handleSave} disabled={!isValid || isSaving} className="text-green-600 hover:text-green-700 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                                                        <Save className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Save Changes</TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="sm" onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Cancel</TooltipContent>
                                                            </Tooltip>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                                                                        <Edit className="h-4 w-4 text-gray-600" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Edit Item</TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(item)}>
                                                                        <Copy className="h-4 w-4 text-gray-600" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Duplicate Item</TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                                        <Trash className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Delete Item</TooltipContent>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                </div>
                                            </TooltipProvider>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t bg-gray-50 dark:bg-gray-800 shrink-0">
                        <div className="text-sm text-gray-500">
                            Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} entries
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Item Dialog */}
            <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl">
                            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                                <Plus className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <span>Add New Charge Item</span>
                        </DialogTitle>
                        <DialogDescription>
                            Create a new charge item for your billing catalog. All fields are required except discount.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Display Name */}
                        <div className="space-y-2">
                            <Label htmlFor="displayName" className="text-sm font-semibold">
                                Display Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="displayName"
                                value={tempItem?.displayName || ''}
                                onChange={(e) => updateTempItem('displayName', e.target.value)}
                                placeholder="e.g., General Consultation, X-Ray Chest"
                                className={!tempItem?.displayName?.trim() ? "border-red-500" : ""}
                                autoFocus
                            />
                            {!tempItem?.displayName?.trim() && (
                                <p className="text-xs text-red-500">Display name is required</p>
                            )}
                        </div>

                        {/* Charge Type (New Field) */}
                        <div className="space-y-2">
                            <Label htmlFor="chargeType" className="text-sm font-semibold">
                                Charge Type <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={tempItem?.chargeType}
                                onValueChange={(val: any) => updateTempItem('chargeType', val)}
                            >
                                <SelectTrigger id="chargeType">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {['Service', 'Product', 'Bed', 'Package', 'Procedure'].map(t => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Visit Type and Category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="visitType" className="text-sm font-semibold">
                                    Visit Type <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={tempItem?.visitType}
                                    onValueChange={(val: any) => updateTempItem('visitType', val)}
                                >
                                    <SelectTrigger id="visitType">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['OPD', 'LAB', 'PHARMACY', 'IPD', 'ER', 'OTHER'].map(t => (
                                            <SelectItem key={t} value={t}>{visitTypeLabel(t)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category" className="text-sm font-semibold">
                                    Category <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={tempItem?.category}
                                    onValueChange={(val: any) => updateTempItem('category', val)}
                                >
                                    <SelectTrigger id="category">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {[
                                            'Consultation', 'Laboratory', 'Radiology', 'Procedures',
                                            'Admission', 'Bed Charges', 'Nursing', 'OT Charges',
                                            'Physiotherapy', 'Vaccination', 'Miscellaneous'
                                        ].map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Rate and Quantity (Moved Rate to be with Qty/Discount) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="defaultRate" className="text-sm font-semibold">
                                    Default Rate (₹) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="defaultRate"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={tempItem?.defaultRate ?? ''}
                                    onChange={(e) => updateTempItem('defaultRate', e.target.value)}
                                    placeholder="0.00"
                                    className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.defaultRate ? 'border-red-500' : ''}`}
                                />
                                {errors.defaultRate && <p className="text-xs text-red-500">{errors.defaultRate}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="defaultQty" className="text-sm font-semibold">
                                    Default Quantity <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="defaultQty"
                                    type="number"
                                    min="1"
                                    value={tempItem?.defaultQty ?? ''}
                                    onChange={(e) => updateTempItem('defaultQty', e.target.value)}
                                    placeholder="1"
                                    className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.defaultQty ? 'border-red-500' : ''}`}
                                />
                                {errors.defaultQty && <p className="text-xs text-red-500">{errors.defaultQty}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="defaultDiscount" className="text-sm font-semibold">
                                    Default Discount (%)
                                </Label>
                                <Input
                                    id="defaultDiscount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={tempItem?.defaultDiscountPercent ?? ''}
                                    onChange={(e) => updateTempItem('defaultDiscountPercent', e.target.value)}
                                    placeholder="0"
                                    className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.defaultDiscountPercent ? 'border-red-500' : ''}`}
                                />
                                {errors.defaultDiscountPercent && <p className="text-xs text-red-500">{errors.defaultDiscountPercent}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Dialog Footer */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                        >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!isValid || isSaving}
                            className="bg-brand-600 hover:bg-brand-700"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Item'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Charge Item?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-gray-900">"{itemToDelete?.displayName}"</span>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};

import { BillingQuickGuide } from './BillingQuickGuide';

export const BillingConfiguration: React.FC = () => {
    const [quickGuideOpen, setQuickGuideOpen] = useState(false);

    return (
        <div className="flex flex-col p-4 space-y-4 w-full">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-6 w-6 text-brand-600" />
                        Charge Master
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Billing Configuration • Services / Procedures / Packages
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickGuideOpen(true)}
                    className="gap-2 text-brand-600 border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                >
                    <HelpCircle className="h-4 w-4" />
                    Quick Guide
                </Button>
            </div>

            <ChargeCatalog />
            <BillingQuickGuide open={quickGuideOpen} onOpenChange={setQuickGuideOpen} />
        </div>
    );
};
