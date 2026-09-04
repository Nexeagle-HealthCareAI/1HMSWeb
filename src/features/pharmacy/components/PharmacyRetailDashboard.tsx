import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store';
import { inventoryApi, InventoryItem } from '@/features/ipd-redesign/services/inventoryApi';
import { storeService } from '@/features/hospital/services/storeService';
import { patientService } from '@/features/billing/services/patientService';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { buildPharmacyReceiptThermal80 } from '@/printTemplates/pharmacyReceiptThermal80';
import { openPrintHtml } from '@/utils/printUtils';
import { pharmacyApi, PharmacyCartItem, PharmacySettlementMode, AllocatedBatchLine } from '../services/pharmacyApi';
import { pharmacyCatalogApi, SubstituteItem } from '../services/pharmacyCatalogApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ShoppingCart, Trash2, User, CreditCard, X, Settings, Lightbulb, Pill, BookOpen, Clock, FileText, Package, RotateCcw, Truck, BarChart3, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TABS = [
    { id: 'pos', label: 'Retail POS', description: 'Point of Sale & Checkout', icon: ShoppingCart },
    { id: 'catalog', label: 'Medicine Catalog', description: 'Manage drugs & inventory', icon: Package },
    { id: 'billing-history', label: 'Billing History', description: 'All pharmacy bills — day/range/all', icon: Receipt },
    { id: 'near-expiry', label: 'Near Expiry', description: 'Track expiring batches', icon: Clock },
    { id: 'h1-register', label: 'H1 Register', description: 'Schedule H1 drugs register', icon: FileText },
    { id: 'reorder', label: 'Reorder', description: 'Stock reorder suggestions', icon: Lightbulb },
    { id: 'returns', label: 'Returns', description: 'Patient return / restock', icon: RotateCcw },
    { id: 'rtv', label: 'RTV', description: 'Return to vendor', icon: Truck },
    { id: 'analytics', label: 'Analytics', description: 'Sales, ABC, GST, expiry-loss', icon: BarChart3 },
] as const;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ItemMaster } from '@/features/hospital/components/masters/ItemMaster';
import { LoadEPrescriptionModal, MappedPrescriptionItem } from './LoadEPrescriptionModal';
import { NearExpiryReport } from './NearExpiryReport';
import { DrugScheduleRegister } from './DrugScheduleRegister';
import { PharmacyPrintSettingsDialog } from './PharmacyPrintSettingsDialog';
import { BulkImportDialog } from './BulkImportDialog';
import { ReorderThresholdSuggestions } from './ReorderThresholdSuggestions';
import { PatientReturnFlow } from './PatientReturnFlow';
import { VendorReturnRTV } from './VendorReturnRTV';
import { PharmacyAnalyticsDashboard } from './PharmacyAnalyticsDashboard';
import { PharmacyBillingHistory } from './PharmacyBillingHistory';

interface CartRow extends PharmacyCartItem {
  id: string; // unique row id
  itemName: string;
  category: string;
  unit: string;
  taxable: boolean;
  gstPercent: number;
  // FEFO preview — the batch that would be picked first for this item, fetched at add-to-cart
  // time so the pharmacist can see it before checkout. The actual allocation (possibly split
  // across multiple batches) is only known once checkout runs and is shown in the receipt toast.
  previewBatchNumber?: string;
  previewExpiryDate?: string;
  scheduleClass?: string | null;
}

export const PharmacyRetailDashboard: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [cart, setCart] = useState<CartRow[]>([]);

  // Customer / walk-in
  const [walkInName, setWalkInName] = useState('');
  const [walkInContact, setWalkInContact] = useState('');
  const [registeredPatientId, setRegisteredPatientId] = useState<string | null>(null);
  const [isRegisteringPatient, setIsRegisteringPatient] = useState(false);

  const [prescriberRef, setPrescriberRef] = useState('');
  const [settlementMode, setSettlementMode] = useState<PharmacySettlementMode>('DIRECT_CASH');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const [storeId, setStoreId] = useState<string | null>(null);

  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // 1-click generic switcher — which out-of-stock item's alternates are currently expanded.
  const [substitutesFor, setSubstitutesFor] = useState<string | null>(null);
  const [substitutes, setSubstitutes] = useState<SubstituteItem[]>([]);
  const [isLoadingSubstitutes, setIsLoadingSubstitutes] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    storeService.getStores(hospitalId)
      .then(stores => {
        const pharmacyStore = stores.find(s => s.storeType === 'PHARMACY' && s.isActive) ?? stores.find(s => s.isActive);
        if (pharmacyStore) {
          setStoreId(pharmacyStore.storeId);
        } else {
          toast.error('No active pharmacy store is configured for this hospital.');
        }
      })
      .catch(() => toast.error('Could not load pharmacy store.'));
  }, [hospitalId]);

  const handleSearch = async () => {
    if (!hospitalId || !searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const items = await inventoryApi.getItems({ search: searchTerm }, hospitalId);
      setSearchResults(items);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFindSubstitutes = async (item: InventoryItem) => {
    if (!hospitalId) return;
    if (substitutesFor === item.inventoryItemId) {
      setSubstitutesFor(null);
      return;
    }
    setSubstitutesFor(item.inventoryItemId);
    setIsLoadingSubstitutes(true);
    try {
      const result = await pharmacyCatalogApi.getSubstitutes(item.inventoryItemId, storeId ?? undefined, hospitalId);
      if (!result.hasComposition) {
        toast.error(`${item.itemName} has no salt composition linked — cannot find alternates.`);
        setSubstitutes([]);
      } else if (result.alternates.length === 0) {
        toast.error('No in-stock alternates found for this composition.');
        setSubstitutes([]);
      } else {
        setSubstitutes(result.alternates);
      }
    } catch {
      toast.error('Could not fetch alternates.');
    } finally {
      setIsLoadingSubstitutes(false);
    }
  };

  const handleAddSubstitute = async (alt: SubstituteItem) => {
    const items = await inventoryApi.getItems({}, hospitalId!);
    const fullItem = items.find(i => i.inventoryItemId === alt.inventoryItemId);
    if (fullItem) {
      addToCart(fullItem);
      setSubstitutesFor(null);
    }
  };

  // Enter in the search box first tries it as a scanned barcode (keyboard-wedge scanners type the
  // code + Enter); if nothing matches, falls back to a normal name/code search.
  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const scanned = searchTerm.trim();
    if (!scanned || !hospitalId) return;

    setIsSearching(true);
    try {
      const result = await inventoryApi.getBatchByBarcode(scanned, { storeId: storeId ?? undefined }, hospitalId);
      if (result.found && result.batch) {
        const items = await inventoryApi.getItems({ search: '' }, hospitalId);
        const item = items.find(i => i.inventoryItemId === result.inventoryItemId);
        if (item) {
          addToCart(item, { batchNumber: result.batch.batchNumber, expiryDate: result.batch.expiryDate ?? undefined });
          setSearchTerm('');
          setSearchResults([]);
          toast.success(`Scanned: ${item.itemName} (Batch ${result.batch.batchNumber})`);
          return;
        }
      }
      await handleSearch();
    } finally {
      setIsSearching(false);
    }
  };

  const addToCart = async (item: InventoryItem, knownBatch?: { batchNumber?: string; expiryDate?: string }) => {
    const existing = cart.find(c => c.inventoryItemId === item.inventoryItemId);
    if (existing) {
      updateQty(existing.id, existing.qty + 1);
      return;
    }

    let previewBatchNumber = knownBatch?.batchNumber;
    let previewExpiryDate = knownBatch?.expiryDate;

    if (!previewBatchNumber && hospitalId && storeId) {
      try {
        const batches = await inventoryApi.getBatches(item.inventoryItemId, { storeId, activeOnly: true }, hospitalId);
        const nearest = batches[0]; // already FEFO-sorted by the API
        previewBatchNumber = nearest?.batchNumber;
        previewExpiryDate = nearest?.expiryDate ?? undefined;
      } catch {
        // Non-fatal — just skip the preview badge if the batch lookup fails.
      }
    }

    const newRow: CartRow = {
      id: Math.random().toString(36).substring(7),
      inventoryItemId: item.inventoryItemId,
      itemName: item.itemName,
      category: item.category,
      unit: item.unit,
      qty: 1,
      rate: item.defaultRate || 0,
      discountPercent: 0,
      taxable: item.isTaxable,
      gstPercent: item.gstSlabPercent || 0,
      previewBatchNumber,
      previewExpiryDate,
      scheduleClass: item.scheduleClass,
    };

    setCart(prev => [...prev, newRow]);
    toast.success(`Added ${item.itemName} to cart`);
  };

  const handleLoadPrescriptionCart = (items: MappedPrescriptionItem[], newPatientId: string) => {
    const newCartItems: CartRow[] = [];
    items.forEach(item => {
      if (item.matchedInventoryItem) {
        const existingIdx = cart.findIndex(c => c.inventoryItemId === item.matchedInventoryItem!.inventoryItemId);
        if (existingIdx < 0) {
          newCartItems.push({
            id: Math.random().toString(36).substring(7),
            inventoryItemId: item.matchedInventoryItem.inventoryItemId,
            itemName: item.matchedInventoryItem.itemName,
            category: item.matchedInventoryItem.category,
            unit: item.matchedInventoryItem.unit,
            qty: item.qtyToDispense,
            rate: item.matchedInventoryItem.defaultRate || 0,
            discountPercent: 0,
            taxable: item.matchedInventoryItem.isTaxable,
            gstPercent: item.matchedInventoryItem.gstSlabPercent || 0,
          });
        }
      }
    });

    if (newCartItems.length > 0) {
      setCart(prev => [...prev, ...newCartItems]);
      toast.success(`Loaded ${newCartItems.length} items from prescription`);
    } else {
      toast.error('No matched items could be loaded automatically');
    }

    setRegisteredPatientId(newPatientId);
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setCart(cart.map(c => c.id === id ? { ...c, qty } : c));
  };

  const updateRate = (id: string, rate: number) => {
    if (rate < 0) return;
    setCart(cart.map(c => c.id === id ? { ...c, rate } : c));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const cartTotals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;

    cart.forEach(item => {
      const lineTotal = item.qty * item.rate;
      const lineDiscount = lineTotal * (item.discountPercent / 100);
      const netLine = lineTotal - lineDiscount;
      subtotal += netLine;

      if (item.taxable) {
        tax += netLine * (item.gstPercent / 100);
      }
    });

    const gross = subtotal + tax;
    const finalTotal = gross - discountAmount;

    return { subtotal, tax, gross, finalTotal };
  }, [cart, discountAmount]);

  const cartHasScheduledDrug = cart.some(c => !!c.scheduleClass);

  const isMobileValid = /^\d{10}$/.test(walkInContact);

  const handleRegisterWalkIn = async () => {
    if (!hospitalId) return;
    if (!walkInName.trim()) {
      toast.error('Enter the patient name');
      return;
    }
    if (!isMobileValid) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setIsRegisteringPatient(true);
    try {
      const patient = await patientService.registerWalkIn(hospitalId, {
        fullName: walkInName.trim(),
        mobile: walkInContact,
      });
      setRegisteredPatientId(patient.patientId);
      toast.success(`Registered ${patient.name}`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not register patient');
    } finally {
      setIsRegisteringPatient(false);
    }
  };

  const clearPatient = () => {
    setRegisteredPatientId(null);
    setWalkInName('');
    setWalkInContact('');
    setSettlementMode('DIRECT_CASH');
  };

  const printReceipt = async (
    invoiceNo: string,
    allocatedBatches: AllocatedBatchLine[],
    checkedOutCart: CartRow[],
    patientLabel: { name: string; id?: string; mobile?: string },
    paidAmount: number,
  ) => {
    if (!hospitalId) return;
    try {
      const [hospital, pharmacySettings] = await Promise.all([
        hospitalApi.getHospitalById(hospitalId),
        pharmacyApi.getPrintSettings(hospitalId),
      ]);
      const printSettings = buildPrintSettingsFromHospital(hospital);

      const itemsByCartId = new Map(checkedOutCart.map(c => [c.inventoryItemId, c]));
      const lines = (allocatedBatches.length > 0 ? allocatedBatches : checkedOutCart.map(c => ({
        inventoryItemId: c.inventoryItemId, batchId: '', batchNumber: undefined, expiryDate: undefined, mrp: undefined, allocatedQty: c.qty,
      }))).map((alloc, idx) => {
        const cartRow = itemsByCartId.get(alloc.inventoryItemId);
        return {
          srNo: idx + 1,
          itemName: cartRow?.itemName ?? 'Item',
          batchNumber: alloc.batchNumber,
          expiryDate: alloc.expiryDate ? new Date(alloc.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : undefined,
          qty: alloc.allocatedQty,
          mrp: alloc.mrp ?? cartRow?.rate,
          discountAmount: cartRow ? (cartRow.qty * cartRow.rate) * (cartRow.discountPercent / 100) : 0,
          gstPercent: cartRow?.gstPercent ?? 0,
          total: (alloc.mrp ?? cartRow?.rate ?? 0) * alloc.allocatedQty,
        };
      });

      const html = buildPharmacyReceiptThermal80(
        {
          invoiceNo,
          date: new Date().toISOString(),
          patientName: patientLabel.name || 'Walk-in Customer',
          patientId: patientLabel.id,
          mobile: patientLabel.mobile,
          items: lines,
          subTotal: cartTotals.subtotal,
          discountTotal: discountAmount,
          taxTotal: cartTotals.tax,
          grandTotal: cartTotals.finalTotal,
          amountPaid: paidAmount,
          paymentMode,
        },
        printSettings,
        {
          tradeName: pharmacySettings.tradeName,
          dl20BNumber: pharmacySettings.dl20BNumber,
          dl21BNumber: pharmacySettings.dl21BNumber,
          fssaiNumber: pharmacySettings.fssaiNumber,
          pharmacistName: pharmacySettings.pharmacistName,
          pharmacistRegNo: pharmacySettings.pharmacistRegNo,
          returnPolicyText: pharmacySettings.returnPolicyText,
        },
      );
      openPrintHtml(html);
    } catch {
      toast.error('Checkout succeeded, but the receipt could not be printed.');
    }
  };

  const handleCheckout = async () => {
    if (!hospitalId || !storeId) return;
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (settlementMode === 'POST_TO_ADMISSION_DAY_BILL' && !registeredPatientId) {
      toast.error('A registered/admitted patient is required to post to the admission day bill');
      return;
    }
    if (cartHasScheduledDrug && !prescriberRef.trim()) {
      toast.error('Cart has a scheduled drug (H/H1/X) — enter the prescriber name/reg. no.');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await pharmacyApi.checkout(hospitalId, {
        storeId: storeId,
        patientId: registeredPatientId ?? undefined,
        walkInName: registeredPatientId ? undefined : walkInName,
        walkInContact: registeredPatientId ? undefined : walkInContact,
        prescriberRef: prescriberRef.trim() || undefined,
        settlementMode,
        items: cart.map(c => ({
          inventoryItemId: c.inventoryItemId,
          qty: c.qty,
          rate: c.rate,
          discountPercent: c.discountPercent
        })),
        totalAmount: cartTotals.finalTotal,
        discountAmount: discountAmount,
        paidAmount: settlementMode === 'POST_TO_ADMISSION_DAY_BILL' ? 0 : cartTotals.finalTotal,
        paymentMode: settlementMode === 'POST_TO_ADMISSION_DAY_BILL' ? undefined : paymentMode
      });

      if (response.success) {
        const batchSummary = summarizeAllocatedBatches(response.allocatedBatches);
        toast.success(
          settlementMode === 'POST_TO_ADMISSION_DAY_BILL'
            ? `Posted to admission day bill.${batchSummary}`
            : `Checkout successful! Invoice: ${response.invoiceNo}${batchSummary}`
        );

        if (settlementMode === 'DIRECT_CASH') {
          printReceipt(
            response.invoiceNo,
            response.allocatedBatches,
            cart,
            { name: walkInName || 'Walk-in Customer', id: registeredPatientId ?? undefined, mobile: walkInContact },
            cartTotals.finalTotal,
          );
        }

        setCart([]);
        clearPatient();
        setSearchResults([]);
        setSearchTerm('');
        setDiscountAmount(0);
        setPrescriberRef('');
      } else {
        toast.error(response.message || 'Checkout failed');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error processing checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-slate-100/60 px-3 sm:px-6 pt-2 pb-4 gap-4 overflow-visible lg:overflow-hidden">
      <Tabs defaultValue="pos" className="flex flex-col flex-1 min-h-0">
        {/* Header Card (Unified Theme & Layout matching IPD, Appointment & Billing Dashboards) */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80 p-5 rounded-[2rem] text-white shadow-lg relative overflow-hidden shrink-0 mb-1">
            {/* Decorative flare */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Left: Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0 flex-1">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                            <Pill className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 pr-4 sm:border-r border-white/20">
                            <h1 className="text-xl font-bold tracking-tight">Pharmacy Retail</h1>
                            <p className="text-[11px] text-brand-100 mt-0.5">Point of Sale & Medicine Management</p>
                        </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => setIsBulkImportOpen(true)} className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white h-8">
                        Bulk Import
                      </Button>
                      <Button variant="outline" size="icon" title="Pharmacy Bill Settings" onClick={() => setIsPrintSettingsOpen(true)} className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white h-8 w-8">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                </div>

                {/* Right: Navigation Tab Capsule */}
                <TabsList className="flex gap-1 p-1 rounded-2xl bg-black/15 dark:bg-black/30 backdrop-blur-sm h-auto w-full sm:w-auto border-0 shadow-none shrink-0 overflow-x-auto custom-scrollbar">
                    {TABS.map((t) => (
                        <TabsTrigger
                            key={t.id}
                            value={t.id}
                            className={cn(
                                "flex flex-col items-center justify-center py-2 text-center rounded-xl transition-all h-auto bg-transparent border-0 text-brand-50 hover:bg-white/10 hover:text-white data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-900 data-[state=active]:text-brand-600 data-[state=active]:dark:text-brand-400 data-[state=active]:shadow-sm data-[state=active]:hover:bg-white",
                                "px-3 select-none whitespace-normal flex-1 sm:flex-none sm:min-w-[100px]"
                            )}
                            title={t.description}
                        >
                            <t.icon className="h-5 w-5 mb-1 shrink-0" />
                            <span className="text-[9px] font-bold tracking-wide leading-tight">{t.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
        </div>

        <div className="flex-1 mt-3 overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
          <TabsContent value="pos" className="h-full m-0 data-[state=inactive]:hidden flex flex-col lg:flex-row data-[state=active]:flex">
        {/* Left Pane: Search & Cart */}
        <div className="flex-1 flex flex-col border-r bg-white dark:bg-slate-900 overflow-hidden">

          <div className="p-4 border-b">
            <div className="flex space-x-2">
              <Input
                placeholder="Scan Barcode or Search Medicine Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4 border rounded-md max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map(item => (
                      <React.Fragment key={item.inventoryItemId}>
                        <TableRow>
                          <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.currentStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.currentStock} {item.unit}
                            </span>
                          </TableCell>
                          <TableCell>₹{item.defaultRate?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell className="space-x-1 whitespace-nowrap">
                            <Button size="sm" onClick={() => addToCart(item)} disabled={item.currentStock <= 0}>
                              Add
                            </Button>
                            {item.currentStock <= 0 && (
                              <Button size="sm" variant="outline" className="text-amber-700 border-amber-300" onClick={() => handleFindSubstitutes(item)}>
                                <Lightbulb className="h-3.5 w-3.5 mr-1" />
                                Alt.
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        {substitutesFor === item.inventoryItemId && (
                          <TableRow className="bg-amber-50">
                            <TableCell colSpan={5}>
                              {isLoadingSubstitutes ? (
                                <span className="text-xs text-muted-foreground">Finding in-stock alternatives...</span>
                              ) : (
                                <div className="flex flex-wrap gap-2 py-1">
                                  {substitutes.map(alt => (
                                    <button
                                      key={alt.inventoryItemId}
                                      onClick={() => handleAddSubstitute(alt)}
                                      className="text-xs px-2 py-1 rounded-md bg-white border border-amber-300 hover:bg-amber-100 flex items-center gap-1"
                                    >
                                      <span className="font-medium">{alt.itemName}</span>
                                      <span className="text-gray-500">{alt.stockAtStore} in stock @ ₹{alt.defaultRate?.toFixed(2) ?? '—'}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 dark:bg-slate-900/20">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ShoppingCart className="h-16 w-16 mb-4 text-gray-300" />
                <p>Cart is empty. Scan or search items to begin.</p>
              </div>
            ) : (
              <div className="border bg-white dark:bg-slate-900 rounded-md overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-slate-800">
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Batch / Expiry</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Rate (₹)</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead className="text-right">Amount (₹)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.itemName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            {item.category}
                            {item.scheduleClass && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-semibold">
                                Sch. {item.scheduleClass}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.previewBatchNumber ? (
                            <div className="text-xs">
                              <div className="font-mono">{item.previewBatchNumber}</div>
                              {item.previewExpiryDate && (
                                <div className="text-gray-500">Exp {new Date(item.previewExpiryDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">FEFO at checkout</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            className="w-20 h-8"
                            value={item.qty}
                            onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-24 h-8"
                            value={item.rate}
                            onChange={(e) => updateRate(item.id, parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          {item.taxable ? <span className="text-xs">{item.gstPercent}%</span> : <span className="text-xs text-gray-400">Nil</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(item.qty * item.rate).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeFromCart(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Checkout */}
        <div className="w-[400px] flex flex-col bg-white dark:bg-slate-900 overflow-hidden shadow-xl z-10">
          <div className="p-6 flex-1 overflow-y-auto space-y-8">

            <section className="space-y-4">
              <div className="flex items-center space-x-2 text-primary font-medium">
                <User className="h-5 w-5" />
                <h3>Customer Details</h3>
              </div>
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border">
                {registeredPatientId ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md p-3">
                    <div>
                      <div className="text-sm font-medium text-green-800">{walkInName || 'Patient registered'}</div>
                      <div className="text-xs text-green-700">{walkInContact}</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearPatient}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Name</label>
                      <Input
                        placeholder="Customer Name"
                        value={walkInName}
                        onChange={(e) => setWalkInName(e.target.value)}
                        className="mt-1 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Mobile Number</label>
                      <Input
                        placeholder="10-digit mobile"
                        value={walkInContact}
                        onChange={(e) => setWalkInContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="mt-1 bg-white dark:bg-slate-900"
                        inputMode="numeric"
                      />
                    </div>
                    <Button
                      className="w-full text-xs"
                      size="sm"
                      onClick={handleRegisterWalkIn}
                      disabled={isRegisteringPatient || !walkInName.trim() || !isMobileValid}
                    >
                      {isRegisteringPatient ? 'Registering...' : 'Register Patient'}
                    </Button>
                  </>
                )}
                <Button variant="outline" className="w-full text-xs" size="sm" onClick={() => setIsPrescriptionModalOpen(true)}>
                  Load e-Prescription
                </Button>
              </div>
            </section>

            {cartHasScheduledDrug && (
              <section className="space-y-2">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <label className="text-xs font-medium text-purple-800">
                    Prescriber Name / Reg. No. (required — cart has a Schedule H/H1/X drug)
                  </label>
                  <Input
                    className="mt-1 bg-white"
                    placeholder="Dr. Name / Reg. No."
                    value={prescriberRef}
                    onChange={(e) => setPrescriberRef(e.target.value)}
                  />
                </div>
              </section>
            )}

            <section className="space-y-4">
              <div className="flex items-center space-x-2 text-primary font-medium">
                <CreditCard className="h-5 w-5" />
                <h3>Payment Summary</h3>
              </div>

              <div className="space-y-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">₹{cartTotals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Estimated Tax</span>
                  <span className="font-medium">₹{cartTotals.tax.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-sm pt-2 border-t">
                  <span className="text-gray-500">Discount (₹)</span>
                  <Input
                    type="number"
                    min="0"
                    className="w-24 h-8 text-right bg-white dark:bg-slate-900"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="flex justify-between items-center text-lg font-bold pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span>Net Payable</span>
                  <span className="text-primary">₹{Math.max(0, cartTotals.finalTotal).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Settlement</label>
                <Select value={settlementMode} onValueChange={(v) => setSettlementMode(v as PharmacySettlementMode)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Settlement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIRECT_CASH">Settle at Counter</SelectItem>
                    <SelectItem value="POST_TO_ADMISSION_DAY_BILL" disabled={!registeredPatientId}>
                      Post to IPD Admission Bill
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settlementMode === 'DIRECT_CASH' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500">Payment Mode</label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Payment Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CARD">Credit/Debit Card</SelectItem>
                      <SelectItem value="CREDIT">Credit (Postpaid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

            </section>
          </div>

          <div className="p-6 border-t bg-gray-50 dark:bg-slate-800/50">
            <Button
              className="w-full h-14 text-lg font-bold shadow-lg"
              size="lg"
              disabled={cart.length === 0 || isProcessing || (cartHasScheduledDrug && !prescriberRef.trim())}
              onClick={handleCheckout}
            >
              {isProcessing
                ? 'Processing...'
                : settlementMode === 'POST_TO_ADMISSION_DAY_BILL'
                  ? `Post ₹${Math.max(0, cartTotals.finalTotal).toFixed(2)} to IPD Bill`
                  : `Pay ₹${Math.max(0, cartTotals.finalTotal).toFixed(2)}`}
            </Button>
          </div>
        </div>

      </TabsContent>

      <TabsContent value="catalog" className="h-full m-0 data-[state=inactive]:hidden flex flex-col data-[state=active]:flex p-4">
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
          <ItemMaster fixedCategory="DRUG" />
        </div>
      </TabsContent>

      <TabsContent value="billing-history" className="h-full m-0 data-[state=inactive]:hidden overflow-y-auto">
        <PharmacyBillingHistory />
      </TabsContent>

      <TabsContent value="near-expiry" className="h-full m-0 data-[state=inactive]:hidden overflow-y-auto">
        <NearExpiryReport />
      </TabsContent>

      <TabsContent value="h1-register" className="h-full m-0 data-[state=inactive]:hidden overflow-y-auto">
        <DrugScheduleRegister />
      </TabsContent>

      <TabsContent value="reorder" className="h-full m-0 data-[state=inactive]:hidden overflow-y-auto">
        <ReorderThresholdSuggestions />
      </TabsContent>

      <TabsContent value="returns" className="h-full m-0 data-[state=inactive]:hidden overflow-y-auto">
        <PatientReturnFlow />
      </TabsContent>

      <TabsContent value="rtv" className="h-full m-0 data-[state=inactive]:hidden overflow-y-auto">
        <VendorReturnRTV />
      </TabsContent>

      <TabsContent value="analytics" className="h-full m-0 data-[state=inactive]:hidden overflow-y-auto">
        <PharmacyAnalyticsDashboard />
      </TabsContent>

      <LoadEPrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        hospitalId={hospitalId!}
        onLoadCart={handleLoadPrescriptionCart}
      />

      <PharmacyPrintSettingsDialog
        isOpen={isPrintSettingsOpen}
        onClose={() => setIsPrintSettingsOpen(false)}
      />

      <BulkImportDialog
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImported={() => { /* stock now reflects in the next search/add */ }}
      />
        </div>
      </Tabs>
    </div>
  );
};

function summarizeAllocatedBatches(batches: AllocatedBatchLine[]): string {
  if (!batches || batches.length === 0) return '';
  const splitCount = batches.length;
  return splitCount > 1 ? ` (${splitCount} batch lines allocated)` : '';
}
