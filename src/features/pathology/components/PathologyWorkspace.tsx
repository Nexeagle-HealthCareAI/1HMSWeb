import React, { useState, useEffect } from 'react';
import { pathologyService, PathologyOrderDto, PathologyTestMaster } from '../services/pathologyService';
import { patientService } from '@/features/billing/services/patientService';
import { Patient } from '@/features/billing/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store';
import { OrderResultEntry } from './OrderResultEntry';

export const PathologyWorkspace: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [orders, setOrders] = useState<PathologyOrderDto[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<PathologyOrderDto | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // New order dialog
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [testCatalog, setTestCatalog] = useState<PathologyTestMaster[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Report generation/approval (order-detail panel)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isApprovingReport, setIsApprovingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<{ reportId: string; reportNo: string; approved: boolean } | null>(null);

  useEffect(() => {
    if (hospitalId) fetchOrders();
  }, [hospitalId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrders = async () => {
    if (!hospitalId) return;
    setIsLoadingOrders(true);
    try {
      const data = await pathologyService.getOrders(hospitalId);
      setOrders(data);
    } catch (e) {
      console.error("Failed to fetch orders", e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleOrderSelect = async (orderId: string) => {
    if (!hospitalId) return;
    setSelectedOrderId(orderId);
    setIsLoadingDetails(true);
    setGeneratedReport(null);
    try {
      const details = await pathologyService.getOrderById(hospitalId, orderId);
      setSelectedOrderDetails(details);
    } catch (e) {
      console.error("Failed to fetch order details", e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PLACED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openNewOrder = () => {
    setPatientQuery('');
    setPatientResults([]);
    setSelectedPatient(null);
    setSelectedTestIds([]);
    setOrderNotes('');
    setNewOrderOpen(true);
    if (hospitalId) {
      pathologyService.getTests(hospitalId).then(setTestCatalog).catch(() => setTestCatalog([]));
    }
  };

  const searchPatients = async () => {
    if (!patientQuery.trim()) return;
    setIsSearchingPatients(true);
    try {
      const results = await patientService.searchPatients(patientQuery.trim(), 'name');
      setPatientResults(results);
    } catch (e) {
      toast.error('Patient search failed');
    } finally {
      setIsSearchingPatients(false);
    }
  };

  const toggleTest = (testId: string) => {
    setSelectedTestIds(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
  };

  const canSubmitOrder = !!selectedPatient && selectedTestIds.length > 0 && !isCreatingOrder;

  const submitOrder = async () => {
    if (!hospitalId || !selectedPatient || selectedTestIds.length === 0) return;
    setIsCreatingOrder(true);
    try {
      const response = await pathologyService.createOrder(hospitalId, {
        patientId: selectedPatient.patientId,
        testIds: selectedTestIds,
        notes: orderNotes || undefined,
      });
      if (!response.success) {
        toast.error('Could not place order', { description: response.message });
        return;
      }
      toast.success('Order placed', { description: response.orderNo });
      setNewOrderOpen(false);
      fetchOrders();
    } catch (e) {
      toast.error('Could not place order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const allResultsEntered = !!selectedOrderDetails && selectedOrderDetails.lines.length > 0
    && selectedOrderDetails.lines.every(l => !!l.result);

  const handleGenerateReport = async () => {
    if (!hospitalId || !selectedOrderDetails) return;
    setIsGeneratingReport(true);
    try {
      const response = await pathologyService.generateReport(hospitalId, selectedOrderDetails.orderId, {});
      if (!response.success || !response.reportId || !response.reportNo) {
        toast.error('Could not generate report', { description: response.message });
        return;
      }
      setGeneratedReport({ reportId: response.reportId, reportNo: response.reportNo, approved: false });
      toast.success('Report generated', { description: response.reportNo });
    } catch (e) {
      toast.error('Could not generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleApproveReport = async () => {
    if (!hospitalId || !selectedOrderDetails || !generatedReport) return;
    setIsApprovingReport(true);
    try {
      const success = await pathologyService.approveReport(hospitalId, selectedOrderDetails.orderId, generatedReport.reportId);
      if (!success) {
        toast.error('Could not approve report');
        return;
      }
      setGeneratedReport(prev => prev ? { ...prev, approved: true } : prev);
      toast.success('Report approved');
    } catch (e) {
      toast.error('Could not approve report');
    } finally {
      setIsApprovingReport(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* Order List */}
      <div className="col-span-4 border rounded-lg flex flex-col h-[calc(100vh-220px)] bg-card">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-lg">Orders Inbox</h2>
          <Button size="sm" onClick={openNewOrder} disabled={!hospitalId}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Order
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {isLoadingOrders ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              ))}
            </div>
          ) : orders.length > 0 ? (
            <div className="p-2 space-y-2">
              {orders.map((order) => (
                <div
                  key={order.orderId}
                  onClick={() => handleOrderSelect(order.orderId)}
                  className={`p-4 rounded-md cursor-pointer border transition-colors ${
                    selectedOrderId === order.orderId
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm">{order.orderNo}</span>
                    <Badge variant="outline" className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">{order.patientName}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(order.orderDate).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No pending orders.
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Order Details & Result Entry */}
      <div className="col-span-8 flex flex-col h-[calc(100vh-220px)]">
        {selectedOrderId ? (
          isLoadingDetails ? (
            <div className="flex-1 flex items-center justify-center">
              <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
          ) : selectedOrderDetails ? (
            <ScrollArea className="flex-1 pr-4">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight mb-2">
                    Order {selectedOrderDetails.orderNo}
                  </h2>
                  {allResultsEntered && !generatedReport && (
                    <Button size="sm" onClick={handleGenerateReport} disabled={isGeneratingReport}>
                      {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                    </Button>
                  )}
                  {generatedReport && !generatedReport.approved && (
                    <Button size="sm" onClick={handleApproveReport} disabled={isApprovingReport}>
                      {isApprovingReport ? 'Approving...' : `Approve Report ${generatedReport.reportNo}`}
                    </Button>
                  )}
                  {generatedReport?.approved && (
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Report {generatedReport.reportNo} approved
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>Patient: <span className="font-medium text-foreground">{selectedOrderDetails.patientName}</span></span>
                  <span>•</span>
                  <span>Date: {new Date(selectedOrderDetails.orderDate).toLocaleString()}</span>
                  <span>•</span>
                  <Badge variant="outline" className={getStatusColor(selectedOrderDetails.status)}>
                    {selectedOrderDetails.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold border-b pb-2">Tests & Results</h3>
                {selectedOrderDetails.lines.length > 0 ? (
                  selectedOrderDetails.lines.map((line) => (
                    <OrderResultEntry
                      key={line.orderLineId}
                      hospitalId={hospitalId ?? ''}
                      orderId={selectedOrderDetails.orderId}
                      orderLine={line}
                      onSuccess={() => handleOrderSelect(selectedOrderDetails.orderId)}
                    />
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No tests found in this order.
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : null
        ) : (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
            Select an order from the list to view details and enter results.
          </div>
        )}
      </div>

      {/* New Order dialog */}
      <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Pathology Order</DialogTitle>
            <DialogDescription>Search for a patient and select the tests to order.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Patient</Label>
              {selectedPatient ? (
                <div className="flex items-center justify-between border rounded-md p-3 mt-1">
                  <div>
                    <div className="font-medium">{selectedPatient.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedPatient.patientId} · {selectedPatient.mobile}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>Change</Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') searchPatients(); }}
                      placeholder="Search by patient name..."
                    />
                    <Button onClick={searchPatients} disabled={isSearchingPatients}>
                      {isSearchingPatients ? 'Searching...' : 'Search'}
                    </Button>
                  </div>
                  {patientResults.length > 0 && (
                    <div className="border rounded-md mt-2 max-h-40 overflow-y-auto divide-y">
                      {patientResults.map((p) => (
                        <div
                          key={p.patientId}
                          className="p-2 cursor-pointer hover:bg-muted text-sm"
                          onClick={() => { setSelectedPatient(p); setPatientResults([]); }}
                        >
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground"> · {p.patientId} · {p.mobile}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <Label>Tests</Label>
              <div className="border rounded-md mt-1 max-h-56 overflow-y-auto divide-y">
                {testCatalog.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No active tests in the catalog.</div>
                ) : (
                  testCatalog.map((t) => (
                    <label key={t.testId} className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-muted">
                      <Checkbox checked={selectedTestIds.includes(t.testId)} onCheckedChange={() => toggleTest(t.testId)} />
                      <span className="font-medium">{t.testName}</span>
                      <span className="text-muted-foreground">({t.testCode})</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOrderOpen(false)}>Cancel</Button>
            <Button onClick={submitOrder} disabled={!canSubmitOrder}>
              {isCreatingOrder ? 'Placing...' : 'Place Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
