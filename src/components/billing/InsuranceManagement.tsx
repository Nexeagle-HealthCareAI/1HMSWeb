import React, { useState } from 'react';
import { 
  Plus, 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface InsuranceProvider {
  id: string;
  name: string;
  tpaName: string;
  contactEmail: string;
  contactPhone: string;
  claimSubmissionUrl?: string;
  cashlessLimit: number;
  coPayPercentage: number;
  status: 'active' | 'inactive';
}

interface InsuranceClaim {
  id: string;
  patientId: string;
  patientName: string;
  billId: string;
  providerId: string;
  providerName: string;
  claimAmount: number;
  approvedAmount: number;
  submissionDate: string;
  status: 'not_submitted' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  rejectionReason?: string;
  documents: { name: string; type: string; uploadDate: string }[];
  preAuthNumber?: string;
  claimNumber?: string;
}

const sampleProviders: InsuranceProvider[] = [
  {
    id: 'IP001',
    name: 'Star Health Insurance',
    tpaName: 'Medi Assist',
    contactEmail: 'claims@starhealth.in',
    contactPhone: '+91-9876543210',
    claimSubmissionUrl: 'https://portal.starhealth.in/claims',
    cashlessLimit: 100000,
    coPayPercentage: 10,
    status: 'active'
  },
  {
    id: 'IP002',
    name: 'HDFC ERGO Health',
    tpaName: 'HDFC ERGO TPA',
    contactEmail: 'tpa@hdfcergo.com',
    contactPhone: '+91-9876543211',
    cashlessLimit: 150000,
    coPayPercentage: 15,
    status: 'active'
  }
];

const sampleClaims: InsuranceClaim[] = [
  {
    id: 'CL001',
    patientId: 'P001',
    patientName: 'John Doe',
    billId: 'BL001',
    providerId: 'IP001',
    providerName: 'Star Health Insurance',
    claimAmount: 45000,
    approvedAmount: 40000,
    submissionDate: '2024-01-15',
    status: 'approved',
    documents: [
      { name: 'prescription.pdf', type: 'Prescription', uploadDate: '2024-01-15' },
      { name: 'lab_report.pdf', type: 'Lab Report', uploadDate: '2024-01-15' },
      { name: 'discharge_summary.pdf', type: 'Discharge Summary', uploadDate: '2024-01-16' }
    ],
    preAuthNumber: 'PA12345',
    claimNumber: 'CLM67890'
  },
  {
    id: 'CL002',
    patientId: 'P002',
    patientName: 'Jane Smith',
    billId: 'BL002',
    providerId: 'IP002',
    providerName: 'HDFC ERGO Health',
    claimAmount: 25000,
    approvedAmount: 0,
    submissionDate: '2024-01-14',
    status: 'under_review',
    documents: [
      { name: 'consultation_note.pdf', type: 'Consultation Note', uploadDate: '2024-01-14' },
      { name: 'investigation_report.pdf', type: 'Investigation Report', uploadDate: '2024-01-14' }
    ],
    claimNumber: 'CLM67891'
  }
];

export const InsuranceManagement: React.FC = () => {
  const [providers, setProviders] = useState<InsuranceProvider[]>(sampleProviders);
  const [claims, setClaims] = useState<InsuranceClaim[]>(sampleClaims);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<InsuranceProvider | null>(null);
  const { toast } = useToast();

  const [newProvider, setNewProvider] = useState<Partial<InsuranceProvider>>({
    name: '',
    tpaName: '',
    contactEmail: '',
    contactPhone: '',
    claimSubmissionUrl: '',
    cashlessLimit: 0,
    coPayPercentage: 0,
    status: 'active'
  });

  const [newClaim, setNewClaim] = useState<Partial<InsuranceClaim>>({
    patientId: '',
    patientName: '',
    billId: '',
    providerId: '',
    claimAmount: 0,
    documents: []
  });

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.billId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: InsuranceClaim['status']) => {
    const statusConfig = {
      not_submitted: { variant: 'outline' as const, icon: Clock, text: 'NOT SUBMITTED' },
      submitted: { variant: 'secondary' as const, icon: Upload, text: 'SUBMITTED' },
      under_review: { variant: 'default' as const, icon: Eye, text: 'UNDER REVIEW' },
      approved: { variant: 'default' as const, icon: CheckCircle, text: 'APPROVED' },
      rejected: { variant: 'destructive' as const, icon: XCircle, text: 'REJECTED' }
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

  const handleSaveProvider = () => {
    if (editingProvider) {
      setProviders(prev => prev.map(p => p.id === editingProvider.id ? { ...editingProvider } : p));
      toast({ title: "Provider Updated", description: "Insurance provider has been updated successfully." });
    } else {
      const provider: InsuranceProvider = {
        id: `IP${String(providers.length + 1).padStart(3, '0')}`,
        ...newProvider as InsuranceProvider
      };
      setProviders(prev => [...prev, provider]);
      toast({ title: "Provider Added", description: "New insurance provider has been added successfully." });
    }
    
    setShowProviderDialog(false);
    setEditingProvider(null);
    setNewProvider({
      name: '',
      tpaName: '',
      contactEmail: '',
      contactPhone: '',
      claimSubmissionUrl: '',
      cashlessLimit: 0,
      coPayPercentage: 0,
      status: 'active'
    });
  };

  const handleSubmitClaim = (claim: InsuranceClaim) => {
    setSelectedClaim(claim);
    setShowSubmitDialog(true);
  };

  const processClaimSubmission = () => {
    if (!selectedClaim) return;

    const updatedClaim: InsuranceClaim = {
      ...selectedClaim,
      status: 'submitted',
      submissionDate: new Date().toISOString().split('T')[0],
      claimNumber: `CLM${Date.now()}`
    };

    setClaims(prev => prev.map(c => c.id === selectedClaim.id ? updatedClaim : c));
    setShowSubmitDialog(false);
    setSelectedClaim(null);
    
    toast({
      title: "Claim Submitted",
      description: `Claim ${updatedClaim.claimNumber} has been submitted successfully.`
    });
  };

  const handleCreateClaim = () => {
    const claim: InsuranceClaim = {
      id: `CL${String(claims.length + 1).padStart(3, '0')}`,
      ...newClaim as InsuranceClaim,
      providerName: providers.find(p => p.id === newClaim.providerId)?.name || '',
      approvedAmount: 0,
      submissionDate: '',
      status: 'not_submitted',
      documents: []
    };

    setClaims(prev => [...prev, claim]);
    setShowClaimDialog(false);
    setNewClaim({
      patientId: '',
      patientName: '',
      billId: '',
      providerId: '',
      claimAmount: 0,
      documents: []
    });
    
    toast({
      title: "Claim Created",
      description: "New insurance claim has been created successfully."
    });
  };

  const handleEditProvider = (provider: InsuranceProvider) => {
    setEditingProvider(provider);
    setShowProviderDialog(true);
  };

  const handleDeleteProvider = (id: string) => {
    setProviders(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Provider Deleted",
      description: "Insurance provider has been removed successfully."
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Insurance Management</h2>
          <p className="text-muted-foreground">Manage insurance providers and claims</p>
        </div>
      </div>

      <Tabs defaultValue="claims" className="space-y-6">
        <TabsList>
          <TabsTrigger value="claims">Claims Management</TabsTrigger>
          <TabsTrigger value="providers">Insurance Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-medium">Insurance Claims</h3>
            <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Claim
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Claim</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Patient ID</Label>
                      <Input
                        value={newClaim.patientId}
                        onChange={(e) => setNewClaim(prev => ({ ...prev, patientId: e.target.value }))}
                        placeholder="Enter patient ID"
                      />
                    </div>
                    <div>
                      <Label>Patient Name</Label>
                      <Input
                        value={newClaim.patientName}
                        onChange={(e) => setNewClaim(prev => ({ ...prev, patientName: e.target.value }))}
                        placeholder="Enter patient name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Bill ID</Label>
                      <Input
                        value={newClaim.billId}
                        onChange={(e) => setNewClaim(prev => ({ ...prev, billId: e.target.value }))}
                        placeholder="Enter bill ID"
                      />
                    </div>
                    <div>
                      <Label>Claim Amount</Label>
                      <Input
                        type="number"
                        value={newClaim.claimAmount}
                        onChange={(e) => setNewClaim(prev => ({ ...prev, claimAmount: Number(e.target.value) }))}
                        placeholder="Enter claim amount"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Insurance Provider</Label>
                    <Select value={newClaim.providerId} onValueChange={(value) => setNewClaim(prev => ({ ...prev, providerId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select insurance provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCreateClaim} className="flex-1">
                      Create Claim
                    </Button>
                    <Button variant="outline" onClick={() => setShowClaimDialog(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search claims by patient name, claim ID, or bill ID..."
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
                <SelectItem value="not_submitted">Not Submitted</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Claims Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left p-4 font-semibold">Claim Details</th>
                      <th className="text-left p-4 font-semibold">Patient</th>
                      <th className="text-left p-4 font-semibold">Provider</th>
                      <th className="text-left p-4 font-semibold">Amount</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClaims.map((claim) => (
                      <tr key={claim.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-primary">{claim.id}</div>
                            <div className="text-sm text-muted-foreground">Bill: {claim.billId}</div>
                            {claim.claimNumber && (
                              <div className="text-xs text-muted-foreground">Claim: {claim.claimNumber}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{claim.patientName}</div>
                            <div className="text-sm text-muted-foreground">{claim.patientId}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{claim.providerName}</div>
                            {claim.submissionDate && (
                              <div className="text-sm text-muted-foreground">Submitted: {claim.submissionDate}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-semibold">₹{claim.claimAmount.toLocaleString()}</div>
                            {claim.approvedAmount > 0 && (
                              <div className="text-sm text-green-600">Approved: ₹{claim.approvedAmount.toLocaleString()}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">{getStatusBadge(claim.status)}</td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                            {claim.status === 'not_submitted' && (
                              <Button size="sm" variant="outline" onClick={() => handleSubmitClaim(claim)}>
                                <Upload className="h-3 w-3" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              <Download className="h-3 w-3" />
                            </Button>
                            {claim.status === 'rejected' && (
                              <Button size="sm" variant="outline" onClick={() => handleSubmitClaim(claim)}>
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Insurance Providers</h3>
            <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add New Provider'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Provider Name</Label>
                      <Input
                        value={editingProvider?.name || newProvider.name}
                        onChange={(e) => editingProvider ? 
                          setEditingProvider({...editingProvider, name: e.target.value}) : 
                          setNewProvider(prev => ({...prev, name: e.target.value}))
                        }
                        placeholder="Enter provider name"
                      />
                    </div>
                    <div>
                      <Label>TPA Name</Label>
                      <Input
                        value={editingProvider?.tpaName || newProvider.tpaName}
                        onChange={(e) => editingProvider ? 
                          setEditingProvider({...editingProvider, tpaName: e.target.value}) : 
                          setNewProvider(prev => ({...prev, tpaName: e.target.value}))
                        }
                        placeholder="Enter TPA name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Contact Email</Label>
                      <Input
                        type="email"
                        value={editingProvider?.contactEmail || newProvider.contactEmail}
                        onChange={(e) => editingProvider ? 
                          setEditingProvider({...editingProvider, contactEmail: e.target.value}) : 
                          setNewProvider(prev => ({...prev, contactEmail: e.target.value}))
                        }
                        placeholder="Enter contact email"
                      />
                    </div>
                    <div>
                      <Label>Contact Phone</Label>
                      <Input
                        value={editingProvider?.contactPhone || newProvider.contactPhone}
                        onChange={(e) => editingProvider ? 
                          setEditingProvider({...editingProvider, contactPhone: e.target.value}) : 
                          setNewProvider(prev => ({...prev, contactPhone: e.target.value}))
                        }
                        placeholder="Enter contact phone"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Claim Submission URL (Optional)</Label>
                    <Input
                      value={editingProvider?.claimSubmissionUrl || newProvider.claimSubmissionUrl}
                      onChange={(e) => editingProvider ? 
                        setEditingProvider({...editingProvider, claimSubmissionUrl: e.target.value}) : 
                        setNewProvider(prev => ({...prev, claimSubmissionUrl: e.target.value}))
                      }
                      placeholder="Enter claim submission URL"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cashless Limit (₹)</Label>
                      <Input
                        type="number"
                        value={editingProvider?.cashlessLimit || newProvider.cashlessLimit}
                        onChange={(e) => editingProvider ? 
                          setEditingProvider({...editingProvider, cashlessLimit: Number(e.target.value)}) : 
                          setNewProvider(prev => ({...prev, cashlessLimit: Number(e.target.value)}))
                        }
                        placeholder="Enter cashless limit"
                      />
                    </div>
                    <div>
                      <Label>Co-pay Percentage (%)</Label>
                      <Input
                        type="number"
                        value={editingProvider?.coPayPercentage || newProvider.coPayPercentage}
                        onChange={(e) => editingProvider ? 
                          setEditingProvider({...editingProvider, coPayPercentage: Number(e.target.value)}) : 
                          setNewProvider(prev => ({...prev, coPayPercentage: Number(e.target.value)}))
                        }
                        placeholder="Enter co-pay percentage"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select 
                      value={editingProvider?.status || newProvider.status} 
                      onValueChange={(value: 'active' | 'inactive') => editingProvider ? 
                        setEditingProvider({...editingProvider, status: value}) : 
                        setNewProvider(prev => ({...prev, status: value}))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveProvider} className="flex-1">
                      {editingProvider ? 'Update Provider' : 'Add Provider'}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setShowProviderDialog(false);
                      setEditingProvider(null);
                    }} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {providers.map((provider) => (
              <Card key={provider.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">TPA: {provider.tpaName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={provider.status === 'active' ? 'default' : 'secondary'}>
                        {provider.status.toUpperCase()}
                      </Badge>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleEditProvider(provider)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteProvider(provider.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Contact:</span>
                      <div className="font-medium">{provider.contactEmail}</div>
                      <div className="text-xs">{provider.contactPhone}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cashless Limit:</span>
                      <div className="font-medium">₹{provider.cashlessLimit.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Co-pay:</span>
                      <div className="font-medium">{provider.coPayPercentage}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Claims Portal:</span>
                      <div className="font-medium text-xs">
                        {provider.claimSubmissionUrl ? 'Available' : 'Manual Only'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Submit Claim Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Claim - {selectedClaim?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Patient:</span>
                <div className="font-medium">{selectedClaim?.patientName}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Provider:</span>
                <div className="font-medium">{selectedClaim?.providerName}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Claim Amount:</span>
                <div className="font-medium">₹{selectedClaim?.claimAmount.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Documents:</span>
                <div className="font-medium">{selectedClaim?.documents.length} files</div>
              </div>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Required Documents:</h4>
              <ul className="text-sm space-y-1">
                <li>• Patient discharge summary</li>
                <li>• Prescription and medication bills</li>
                <li>• Lab/diagnostic reports</li>
                <li>• Hospital bills and receipts</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={processClaimSubmission} className="flex-1">
                Submit Claim
              </Button>
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};