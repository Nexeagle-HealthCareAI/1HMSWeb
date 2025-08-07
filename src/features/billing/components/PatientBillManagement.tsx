import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  DollarSign, 
  Calendar, 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  CreditCard,
  Receipt,
  Calculator,
  Send,
  Printer,
  Copy,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface BillItem {
  id: string;
  service: string;
  category: string;
  amount: number;
  quantity: number;
  total: number;
}

interface PatientBill {
  id: string;
  patientId: string;
  patientName: string;
  doctor: string;
  department: string;
  date: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethods: { method: string; amount: number; date: string }[];
  status: 'paid' | 'pending' | 'partial' | 'refunded';
  version: number;
  auditTrail: { action: string; user: string; timestamp: string; reason?: string }[];
}

interface RefundRequest {
  billId: string;
  amount: number;
  reason: string;
  requestedBy: string;
  items: { itemId: string; refundAmount: number }[];
}

const sampleBills: PatientBill[] = [
  {
    id: 'BL001',
    patientId: 'P001',
    patientName: 'John Doe',
    doctor: 'Dr. Sarah Johnson',
    department: 'Cardiology',
    date: '2024-01-15',
    items: [
      { id: 'I1', service: 'Consultation', category: 'OPD', amount: 800, quantity: 1, total: 800 },
      { id: 'I2', service: 'ECG', category: 'Diagnostic', amount: 500, quantity: 1, total: 500 },
      { id: 'I3', service: 'Blood Test', category: 'Lab', amount: 400, quantity: 1, total: 400 }
    ],
    subtotal: 1700,
    discount: 100,
    tax: 288,
    total: 1888,
    paidAmount: 1888,
    balanceAmount: 0,
    paymentMethods: [
      { method: 'UPI', amount: 1888, date: '2024-01-15' }
    ],
    status: 'paid',
    version: 1,
    auditTrail: [
      { action: 'CREATED', user: 'receptionist@hospital.com', timestamp: '2024-01-15 10:30:00' },
      { action: 'PAID', user: 'receptionist@hospital.com', timestamp: '2024-01-15 10:35:00' }
    ]
  },
  {
    id: 'BL002',
    patientId: 'P002',
    patientName: 'Jane Smith',
    doctor: 'Dr. Michael Chen',
    department: 'Pediatrics',
    date: '2024-01-14',
    items: [
      { id: 'I1', service: 'Consultation', category: 'OPD', amount: 600, quantity: 1, total: 600 },
      { id: 'I2', service: 'Vaccination', category: 'Treatment', amount: 350, quantity: 2, total: 700 }
    ],
    subtotal: 1300,
    discount: 50,
    tax: 225,
    total: 1475,
    paidAmount: 1000,
    balanceAmount: 475,
    paymentMethods: [
      { method: 'Cash', amount: 500, date: '2024-01-14' },
      { method: 'Card', amount: 500, date: '2024-01-14' }
    ],
    status: 'partial',
    version: 2,
    auditTrail: [
      { action: 'CREATED', user: 'receptionist@hospital.com', timestamp: '2024-01-14 14:20:00' },
      { action: 'PARTIAL_PAYMENT', user: 'receptionist@hospital.com', timestamp: '2024-01-14 14:25:00' },
      { action: 'EDITED', user: 'billing_admin@hospital.com', timestamp: '2024-01-14 16:30:00', reason: 'Vaccination quantity corrected' }
    ]
  }
];

export const PatientBillManagement: React.FC = () => {
  const [bills, setBills] = useState<PatientBill[]>(sampleBills);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBill, setSelectedBill] = useState<PatientBill | null>(null);
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [refundRequest, setRefundRequest] = useState<Partial<RefundRequest>>({
    amount: 0,
    reason: '',
    items: []
  });
  const [paymentData, setPaymentData] = useState({
    method: 'cash',
    amount: 0,
    reference: ''
  });
  const { toast } = useToast();

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: PatientBill['status']) => {
    const statusConfig = {
      paid: { variant: 'default' as const, icon: CheckCircle, text: 'PAID' },
      pending: { variant: 'destructive' as const, icon: AlertCircle, text: 'PENDING' },
      partial: { variant: 'secondary' as const, icon: Clock, text: 'PARTIAL' },
      refunded: { variant: 'outline' as const, icon: Trash2, text: 'REFUNDED' }
    };
    
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const handleViewBill = (bill: PatientBill) => {
    setSelectedBill(bill);
    setShowBillDialog(true);
  };

  const handleRefund = (bill: PatientBill) => {
    setSelectedBill(bill);
    setRefundRequest({
      billId: bill.id,
      amount: 0,
      reason: '',
      items: []
    });
    setShowRefundDialog(true);
  };

  const handleAddPayment = (bill: PatientBill) => {
    setSelectedBill(bill);
    setPaymentData({
      method: 'cash',
      amount: bill.balanceAmount,
      reference: ''
    });
    setShowPaymentDialog(true);
  };

  const handleEditBill = (bill: PatientBill) => {
    setSelectedBill(bill);
    setShowEditDialog(true);
  };

  const processRefund = () => {
    if (!selectedBill || !refundRequest.amount || !refundRequest.reason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields for the refund.",
        variant: "destructive"
      });
      return;
    }

    // Process refund logic here
    const updatedBill: PatientBill = {
      ...selectedBill,
      status: refundRequest.amount === selectedBill.paidAmount ? 'refunded' : 'partial',
      paidAmount: selectedBill.paidAmount - refundRequest.amount,
      balanceAmount: selectedBill.balanceAmount + refundRequest.amount,
      version: selectedBill.version + 1,
      auditTrail: [
        ...selectedBill.auditTrail,
        {
          action: 'REFUND_PROCESSED',
          user: 'billing_admin@hospital.com',
          timestamp: new Date().toLocaleString(),
          reason: refundRequest.reason
        }
      ]
    };

    setBills(prev => prev.map(bill => bill.id === selectedBill.id ? updatedBill : bill));
    setShowRefundDialog(false);
    setSelectedBill(null);
    
    toast({
      title: "Refund Processed",
      description: `Refund of ₹${refundRequest.amount} has been processed successfully.`
    });
  };

  const processPayment = () => {
    if (!selectedBill || !paymentData.amount) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid payment amount.",
        variant: "destructive"
      });
      return;
    }

    const updatedBill: PatientBill = {
      ...selectedBill,
      paidAmount: selectedBill.paidAmount + paymentData.amount,
      balanceAmount: selectedBill.balanceAmount - paymentData.amount,
      status: (selectedBill.balanceAmount - paymentData.amount) <= 0 ? 'paid' : 'partial',
      paymentMethods: [
        ...selectedBill.paymentMethods,
        {
          method: paymentData.method,
          amount: paymentData.amount,
          date: new Date().toISOString().split('T')[0]
        }
      ],
      version: selectedBill.version + 1,
      auditTrail: [
        ...selectedBill.auditTrail,
        {
          action: 'PAYMENT_RECEIVED',
          user: 'receptionist@hospital.com',
          timestamp: new Date().toLocaleString()
        }
      ]
    };

    setBills(prev => prev.map(bill => bill.id === selectedBill.id ? updatedBill : bill));
    setShowPaymentDialog(false);
    setSelectedBill(null);
    
    toast({
      title: "Payment Recorded",
      description: `Payment of ₹${paymentData.amount} has been recorded successfully.`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Patient Bill Management</h2>
          <p className="text-muted-foreground">View, edit, and manage patient billing information</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient name, bill ID, or patient ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bills Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-semibold">Bill Details</th>
                  <th className="text-left p-4 font-semibold">Patient</th>
                  <th className="text-left p-4 font-semibold">Doctor/Dept</th>
                  <th className="text-left p-4 font-semibold">Amount</th>
                  <th className="text-left p-4 font-semibold">Payment Status</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-primary">{bill.id}</div>
                        <div className="text-sm text-muted-foreground">{bill.date}</div>
                        <div className="text-xs text-muted-foreground">v{bill.version}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{bill.patientName}</div>
                        <div className="text-sm text-muted-foreground">{bill.patientId}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{bill.doctor}</div>
                        <div className="text-sm text-muted-foreground">{bill.department}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-semibold">₹{bill.total.toLocaleString()}</div>
                        <div className="text-sm text-green-600">Paid: ₹{bill.paidAmount.toLocaleString()}</div>
                        {bill.balanceAmount > 0 && (
                          <div className="text-sm text-red-600">Due: ₹{bill.balanceAmount.toLocaleString()}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {bill.paymentMethods.map((payment, index) => (
                          <div key={index} className="text-xs">
                            <span className="font-medium capitalize">{payment.method}:</span> ₹{payment.amount}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(bill.status)}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleViewBill(bill)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        {bill.status !== 'paid' && (
                          <Button size="sm" variant="outline" onClick={() => handleEditBill(bill)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        {bill.balanceAmount > 0 && (
                          <Button size="sm" variant="outline" onClick={() => handleAddPayment(bill)}>
                            <CreditCard className="h-3 w-3" />
                          </Button>
                        )}
                        {bill.paidAmount > 0 && (
                          <Button size="sm" variant="outline" onClick={() => handleRefund(bill)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Printer className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bill Details Dialog */}
      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details - {selectedBill?.id}</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">Bill Details</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="audit">Audit Trail</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Patient Information</Label>
                    <div className="mt-1 space-y-1">
                      <div><strong>Name:</strong> {selectedBill.patientName}</div>
                      <div><strong>ID:</strong> {selectedBill.patientId}</div>
                      <div><strong>Doctor:</strong> {selectedBill.doctor}</div>
                      <div><strong>Department:</strong> {selectedBill.department}</div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Bill Summary</Label>
                    <div className="mt-1 space-y-1">
                      <div><strong>Date:</strong> {selectedBill.date}</div>
                      <div><strong>Version:</strong> {selectedBill.version}</div>
                      <div><strong>Status:</strong> {getStatusBadge(selectedBill.status)}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Bill Items</Label>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-left p-3 font-medium">Service</th>
                          <th className="text-left p-3 font-medium">Category</th>
                          <th className="text-left p-3 font-medium">Rate</th>
                          <th className="text-left p-3 font-medium">Qty</th>
                          <th className="text-left p-3 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBill.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-3">{item.service}</td>
                            <td className="p-3">{item.category}</td>
                            <td className="p-3">₹{item.amount}</td>
                            <td className="p-3">{item.quantity}</td>
                            <td className="p-3 font-medium">₹{item.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{selectedBill.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-₹{selectedBill.discount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (18%):</span>
                      <span>₹{selectedBill.tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>₹{selectedBill.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Paid Amount:</span>
                      <span>₹{selectedBill.paidAmount.toLocaleString()}</span>
                    </div>
                    {selectedBill.balanceAmount > 0 && (
                      <div className="flex justify-between text-red-600 font-medium">
                        <span>Balance Due:</span>
                        <span>₹{selectedBill.balanceAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="payments">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Payment History</Label>
                  {selectedBill.paymentMethods.map((payment, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium capitalize">{payment.method}</div>
                            <div className="text-sm text-muted-foreground">{payment.date}</div>
                          </div>
                          <div className="text-lg font-semibold">₹{payment.amount.toLocaleString()}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="audit">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Audit Trail</Label>
                  {selectedBill.auditTrail.map((entry, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{entry.action.replace(/_/g, ' ')}</div>
                            <div className="text-sm text-muted-foreground">by {entry.user}</div>
                            {entry.reason && (
                              <div className="text-sm mt-1 p-2 bg-muted rounded">
                                <strong>Reason:</strong> {entry.reason}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{entry.timestamp}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund - {selectedBill?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Refund Amount</Label>
              <Input
                type="number"
                max={selectedBill?.paidAmount}
                value={refundRequest.amount}
                onChange={(e) => setRefundRequest(prev => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="Enter refund amount"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Maximum refundable: ₹{selectedBill?.paidAmount.toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Reason for Refund</Label>
              <Textarea
                value={refundRequest.reason}
                onChange={(e) => setRefundRequest(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter reason for refund"
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={processRefund} className="flex-1" variant="destructive">
                Process Refund
              </Button>
              <Button variant="outline" onClick={() => setShowRefundDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment - {selectedBill?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentData.method} onValueChange={(value) => setPaymentData(prev => ({ ...prev, method: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="online">Online Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Amount</Label>
              <Input
                type="number"
                max={selectedBill?.balanceAmount}
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="Enter payment amount"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Balance due: ₹{selectedBill?.balanceAmount.toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Reference Number (Optional)</Label>
              <Input
                value={paymentData.reference}
                onChange={(e) => setPaymentData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Transaction ID, cheque number, etc."
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={processPayment} className="flex-1">
                Record Payment
              </Button>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};