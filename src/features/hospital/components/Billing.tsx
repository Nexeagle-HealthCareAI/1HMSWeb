import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Download, 
  Printer, 
  Filter,
  Search,
  DollarSign,
  Calendar,
  User,
  X,
  Settings,
  BarChart3,
  FileText,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
// import { ContextualGuide } from './guide/ContextualGuide';
// import { BILLING_GUIDES } from './guide/GuideData';

import { FinancialReports } from '@/features/billing/components/FinancialReports';
import { PatientBillManagement } from '@/features/billing/components/PatientBillManagement';
import { InsuranceManagement } from '@/features/billing/components/InsuranceManagement';

interface BillItem {
  service: string;
  amount: number;
  quantity: number;
}

interface Bill {
  id: string;
  patientName: string;
  patientId: string;
  doctor: string;
  date: string;
  items: BillItem[];
  discount: number;
  gst: number;
  total: number;
  paymentMode: string;
  status: 'paid' | 'pending' | 'partial';
}

const sampleBills: Bill[] = [
  {
    id: 'BL001',
    patientName: 'John Doe',
    patientId: 'P001',
    doctor: 'Dr. Sarah Johnson',
    date: '2024-01-15',
    items: [
      { service: 'Consultation', amount: 500, quantity: 1 },
      { service: 'ECG', amount: 300, quantity: 1 }
    ],
    discount: 50,
    gst: 144,
    total: 894,
    paymentMode: 'UPI',
    status: 'paid'
  },
  {
    id: 'BL002',
    patientName: 'Jane Smith',
    patientId: 'P002',
    doctor: 'Dr. Michael Chen',
    date: '2024-01-14',
    items: [
      { service: 'Consultation', amount: 600, quantity: 1 },
      { service: 'Blood Test', amount: 800, quantity: 1 }
    ],
    discount: 0,
    gst: 252,
    total: 1652,
    paymentMode: 'Card',
    status: 'paid'
  }
];

export const Billing: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>(sampleBills);
  const [showNewBill, setShowNewBill] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();

  const [newBill, setNewBill] = useState({
    patientName: '',
    patientId: '',
    doctor: '',
    items: [{ service: '', amount: 0, quantity: 1 }],
    discount: 0,
    gstEnabled: true,
    paymentMode: 'cash'
  });

  const addBillItem = () => {
    setNewBill(prev => ({
      ...prev,
      items: [...prev.items, { service: '', amount: 0, quantity: 1 }]
    }));
  };

  const removeBillItem = (index: number) => {
    setNewBill(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateBillItem = (index: number, field: string, value: any) => {
    setNewBill(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateBillTotal = () => {
    const subtotal = newBill.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
    const afterDiscount = subtotal - newBill.discount;
    const gst = newBill.gstEnabled ? afterDiscount * 0.18 : 0;
    return afterDiscount + gst;
  };

  const handleCreateBill = () => {
    const subtotal = newBill.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
    const afterDiscount = subtotal - newBill.discount;
    const gst = newBill.gstEnabled ? afterDiscount * 0.18 : 0;
    const total = afterDiscount + gst;

    const bill: Bill = {
      id: `BL${String(bills.length + 1).padStart(3, '0')}`,
      patientName: newBill.patientName,
      patientId: newBill.patientId,
      doctor: newBill.doctor,
      date: new Date().toISOString().split('T')[0],
      items: newBill.items,
      discount: newBill.discount,
      gst: gst,
      total: total,
      paymentMode: newBill.paymentMode,
      status: 'paid'
    };

    setBills(prev => [bill, ...prev]);
    setShowNewBill(false);
    setNewBill({
      patientName: '',
      patientId: '',
      doctor: '',
      items: [{ service: '', amount: 0, quantity: 1 }],
      discount: 0,
      gstEnabled: true,
      paymentMode: 'cash'
    });

    toast({
      title: "Bill Created",
      description: `Bill ${bill.id} has been generated successfully.`,
    });
  };

  const getStatusBadge = (status: Bill['status']) => {
    const variants = {
      paid: 'default',
      pending: 'destructive',
      partial: 'secondary'
    };
    return <Badge variant={variants[status] as any}>{status.toUpperCase()}</Badge>;
  };

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || bill.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6 bg-gradient-subtle">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Insurance</h1>
          <p className="text-muted-foreground">Comprehensive billing and insurance management</p>
        </div>
      </div>

      <Tabs defaultValue="bills" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bills" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Patient Bills
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Insurance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bills">
          <PatientBillManagement />
        </TabsContent>

        <TabsContent value="reports">
          <FinancialReports />
        </TabsContent>

        <TabsContent value="insurance">
          <InsuranceManagement />
        </TabsContent>
      </Tabs>

      {/* Legacy Bill Creation - Keep for quick access */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Quick Bill Creation</CardTitle>
            <Dialog open={showNewBill} onOpenChange={setShowNewBill}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Bill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Bill</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* ... keep existing code (patient info, bill items, etc.) */}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patientName">Patient Name</Label>
                      <Input
                        id="patientName"
                        value={newBill.patientName}
                        onChange={(e) => setNewBill(prev => ({ ...prev, patientName: e.target.value }))}
                        placeholder="Enter patient name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="patientId">Patient ID</Label>
                      <Input
                        id="patientId"
                        value={newBill.patientId}
                        onChange={(e) => setNewBill(prev => ({ ...prev, patientId: e.target.value }))}
                        placeholder="Enter patient ID"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="doctor">Doctor</Label>
                    <Select value={newBill.doctor} onValueChange={(value) => setNewBill(prev => ({ ...prev, doctor: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dr. Sarah Johnson">Dr. Sarah Johnson</SelectItem>
                        <SelectItem value="Dr. Michael Chen">Dr. Michael Chen</SelectItem>
                        <SelectItem value="Dr. Emily Davis">Dr. Emily Davis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Label>Bill Items</Label>
                      <Button onClick={addBillItem} size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {newBill.items.map((item, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Input
                              placeholder="Service"
                              value={item.service}
                              onChange={(e) => updateBillItem(index, 'service', e.target.value)}
                            />
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              placeholder="Amount"
                              value={item.amount}
                              onChange={(e) => updateBillItem(index, 'amount', Number(e.target.value))}
                            />
                          </div>
                          <div className="w-16">
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => updateBillItem(index, 'quantity', Number(e.target.value))}
                            />
                          </div>
                          {newBill.items.length > 1 && (
                            <Button
                              onClick={() => removeBillItem(index)}
                              size="sm"
                              variant="outline"
                              className="px-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="discount">Discount (₹)</Label>
                      <Input
                        id="discount"
                        type="number"
                        value={newBill.discount}
                        onChange={(e) => setNewBill(prev => ({ ...prev, discount: Number(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>GST (18%)</Label>
                      <Select 
                        value={newBill.gstEnabled ? 'yes' : 'no'} 
                        onValueChange={(value) => setNewBill(prev => ({ ...prev, gstEnabled: value === 'yes' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Include GST</SelectItem>
                          <SelectItem value="no">Exclude GST</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Payment Mode</Label>
                      <Select value={newBill.paymentMode} onValueChange={(value) => setNewBill(prev => ({ ...prev, paymentMode: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="wallet">Wallet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-lg font-semibold">
                      Total: ₹{calculateBillTotal().toFixed(2)}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCreateBill} className="flex-1">
                      Create Bill
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewBill(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Use this quick form to create basic bills. For advanced billing features, use the tabs above.</p>
        </CardContent>
      </Card>
    </div>
  );
};