import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store';
import { inventoryApi, InventoryItem, BatchItem } from '@/features/ipd-redesign/services/inventoryApi';
import { pharmacyApi, PharmacyCartItem } from '../services/pharmacyApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ShoppingCart, Trash2, User, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ItemMaster } from '@/features/hospital/components/masters/ItemMaster';
import { LoadEPrescriptionModal, MappedPrescriptionItem } from './LoadEPrescriptionModal';

interface CartRow extends PharmacyCartItem {
  id: string; // unique row id
  itemName: string;
  category: string;
  unit: string;
  taxable: boolean;
  gstPercent: number;
}

export const PharmacyRetailDashboard: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const user = useAuthStore(state => state.user);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [cart, setCart] = useState<CartRow[]>([]);
  
  // Checkout Details
  const [walkInName, setWalkInName] = useState('');
  const [walkInContact, setWalkInContact] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // In a real app, you would select the specific Pharmacy Store ID. 
  // For this prototype, we'll hardcode or fetch the first store.
  const [storeId, setStoreId] = useState<string | null>(null);

  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);

  useEffect(() => {
    // Fetch stores to find the pharmacy store
    const fetchStores = async () => {
      // Dummy store ID for now if we don't have a dedicated endpoint for store lookup in this component
      // In production, we'd fetch from storeApi.ts
      setStoreId('00000000-0000-0000-0000-000000000000'); 
    };
    fetchStores();
  }, [hospitalId]);

  const handleSearch = async () => {
    if (!hospitalId || !searchTerm.trim()) return;
    setIsSearching(true);
    try {
      // In production, use a dedicated search endpoint. Using getItems with a filter for now.
      const items = await inventoryApi.getItems(hospitalId);
      const filtered = items.filter(i => 
        i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.itemCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const addToCart = (item: InventoryItem) => {
    // Check if already in cart
    const existing = cart.find(c => c.inventoryItemId === item.inventoryItemId);
    if (existing) {
      updateQty(existing.id, existing.qty + 1);
      return;
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
    };

    setCart([...cart, newRow]);
    toast.success(`Added ${item.itemName} to cart`);
  };

  const handleLoadPrescriptionCart = (items: MappedPrescriptionItem[], newPatientId: string) => {
    const newCartItems: CartRow[] = [];
    items.forEach(item => {
      if (item.matchedInventoryItem) {
        // Find if already exists
        const existingIdx = cart.findIndex(c => c.inventoryItemId === item.matchedInventoryItem!.inventoryItemId);
        if (existingIdx >= 0) {
          // Just ignore or we could update quantity, but we will ignore to avoid doubling if they click twice
        } else {
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
    
    // Optionally lock the walk-in to the patient ID
    setWalkInName(`Patient: ${newPatientId}`);
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

  // Calculations
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

  const handleCheckout = async () => {
    if (!hospitalId || !storeId) return;
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await pharmacyApi.checkout(hospitalId, {
        storeId: storeId,
        walkInName: walkInName,
        walkInContact: walkInContact,
        items: cart.map(c => ({
          inventoryItemId: c.inventoryItemId,
          qty: c.qty,
          rate: c.rate,
          discountPercent: c.discountPercent
        })),
        totalAmount: cartTotals.finalTotal,
        discountAmount: discountAmount,
        paidAmount: cartTotals.finalTotal, // Default to full payment for now
        paymentMode: paymentMode
      });

      if (response.success) {
        toast.success(`Checkout successful! Invoice: ${response.invoiceNo}`);
        // Reset Cart
        setCart([]);
        setWalkInName('');
        setWalkInContact('');
        setSearchResults([]);
        setSearchTerm('');
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
    <Tabs defaultValue="pos" className="h-full flex flex-col bg-gray-50 dark:bg-slate-900/50">
      <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Pharmacy Retail</h1>
          <p className="text-sm text-muted-foreground">Point of Sale & Medicine Management</p>
        </div>
        <TabsList className="bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="pos">Retail POS</TabsTrigger>
          <TabsTrigger value="catalog">Medicine Catalog</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="pos" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex">
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
                      <TableRow key={item.inventoryItemId}>
                        <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.currentStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.currentStock} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell>₹{item.defaultRate?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => addToCart(item)} disabled={item.currentStock <= 0}>
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
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
                          <div className="text-xs text-gray-500">{item.category}</div>
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
                <div>
                  <label className="text-xs font-medium text-gray-500">Name (Optional Walk-In)</label>
                  <Input 
                    placeholder="Customer Name" 
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    className="mt-1 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Contact Number (Optional)</label>
                  <Input 
                    placeholder="Phone Number" 
                    value={walkInContact}
                    onChange={(e) => setWalkInContact(e.target.value)}
                    className="mt-1 bg-white dark:bg-slate-900"
                  />
                </div>
                <Button variant="outline" className="w-full text-xs" size="sm" onClick={() => setIsPrescriptionModalOpen(true)}>
                  Load e-Prescription
                </Button>
              </div>
            </section>

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

            </section>
          </div>

          <div className="p-6 border-t bg-gray-50 dark:bg-slate-800/50">
            <Button 
              className="w-full h-14 text-lg font-bold shadow-lg" 
              size="lg"
              disabled={cart.length === 0 || isProcessing}
              onClick={handleCheckout}
            >
              {isProcessing ? 'Processing...' : `Pay ₹${Math.max(0, cartTotals.finalTotal).toFixed(2)}`}
            </Button>
          </div>
        </div>

      </TabsContent>

      <TabsContent value="catalog" className="flex-1 overflow-hidden mt-0 p-4">
        <div className="h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
          <ItemMaster fixedCategory="DRUG" />
        </div>
      </TabsContent>

      <LoadEPrescriptionModal 
        isOpen={isPrescriptionModalOpen} 
        onClose={() => setIsPrescriptionModalOpen(false)} 
        hospitalId={hospitalId!} 
        onLoadCart={handleLoadPrescriptionCart} 
      />
    </Tabs>
  );
};
