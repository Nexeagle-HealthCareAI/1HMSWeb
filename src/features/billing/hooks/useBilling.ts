import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface BillingRule {
  id: string;
  name: string;
  description: string;
  category: 'consultation' | 'procedure' | 'medication' | 'test' | 'other';
  basePrice: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

interface BillingTransaction {
  id: string;
  patientId: string;
  patientName: string;
  service: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod: string;
  transactionDate: string;
  createdAt: string;
}

interface InsuranceClaim {
  id: string;
  patientId: string;
  patientName: string;
  insuranceProvider: string;
  claimAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  submittedDate: string;
  processedDate?: string;
  createdAt: string;
}

// Sample data
const sampleBillingRules: BillingRule[] = [
  {
    id: 'BR001',
    name: 'Standard Consultation',
    description: 'Regular doctor consultation fee',
    category: 'consultation',
    basePrice: 50,
    currency: 'USD',
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'BR002',
    name: 'Specialist Consultation',
    description: 'Specialist doctor consultation fee',
    category: 'consultation',
    basePrice: 100,
    currency: 'USD',
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'BR003',
    name: 'Blood Test',
    description: 'Standard blood test procedure',
    category: 'test',
    basePrice: 25,
    currency: 'USD',
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'BR004',
    name: 'X-Ray',
    description: 'X-Ray imaging procedure',
    category: 'procedure',
    basePrice: 75,
    currency: 'USD',
    isActive: true,
    createdAt: '2024-01-01'
  }
];

const sampleTransactions: BillingTransaction[] = [
  {
    id: 'TXN001',
    patientId: 'P001',
    patientName: 'John Doe',
    service: 'Standard Consultation',
    amount: 50,
    currency: 'USD',
    status: 'paid',
    paymentMethod: 'Credit Card',
    transactionDate: '2024-01-15 10:30:00',
    createdAt: '2024-01-15'
  },
  {
    id: 'TXN002',
    patientId: 'P002',
    patientName: 'Jane Smith',
    service: 'Blood Test',
    amount: 25,
    currency: 'USD',
    status: 'pending',
    paymentMethod: 'Cash',
    transactionDate: '2024-01-15 14:20:00',
    createdAt: '2024-01-15'
  },
  {
    id: 'TXN003',
    patientId: 'P003',
    patientName: 'Mike Johnson',
    service: 'X-Ray',
    amount: 75,
    currency: 'USD',
    status: 'paid',
    paymentMethod: 'Insurance',
    transactionDate: '2024-01-14 16:45:00',
    createdAt: '2024-01-14'
  }
];

const sampleInsuranceClaims: InsuranceClaim[] = [
  {
    id: 'IC001',
    patientId: 'P001',
    patientName: 'John Doe',
    insuranceProvider: 'Blue Cross',
    claimAmount: 500,
    status: 'approved',
    submittedDate: '2024-01-10',
    processedDate: '2024-01-12',
    createdAt: '2024-01-10'
  },
  {
    id: 'IC002',
    patientId: 'P002',
    patientName: 'Jane Smith',
    insuranceProvider: 'Aetna',
    claimAmount: 300,
    status: 'pending',
    submittedDate: '2024-01-15',
    createdAt: '2024-01-15'
  },
  {
    id: 'IC003',
    patientId: 'P003',
    patientName: 'Mike Johnson',
    insuranceProvider: 'Cigna',
    claimAmount: 750,
    status: 'rejected',
    submittedDate: '2024-01-08',
    processedDate: '2024-01-11',
    createdAt: '2024-01-08'
  }
];

export const useBilling = () => {
  const [billingRules, setBillingRules] = useState<BillingRule[]>(sampleBillingRules);
  const [transactions, setTransactions] = useState<BillingTransaction[]>(sampleTransactions);
  const [insuranceClaims, setInsuranceClaims] = useState<InsuranceClaim[]>(sampleInsuranceClaims);
  const [activeTab, setActiveTab] = useState('rules');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const { toast } = useToast();

  const filteredBillingRules = billingRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || rule.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || transaction.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredInsuranceClaims = insuranceClaims.filter(claim => {
    const matchesSearch = claim.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.insuranceProvider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || claim.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const createBillingRule = (rule: Omit<BillingRule, 'id' | 'createdAt'>) => {
    const newRule: BillingRule = {
      ...rule,
      id: `BR${String(billingRules.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setBillingRules(prev => [...prev, newRule]);
    toast({
      title: "Billing Rule Created",
      description: "New billing rule has been created successfully."
    });
  };

  const updateBillingRule = (id: string, updatedRule: Partial<BillingRule>) => {
    setBillingRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, ...updatedRule } : rule
    ));
    toast({
      title: "Billing Rule Updated",
      description: "Billing rule has been updated successfully."
    });
  };

  const deleteBillingRule = (id: string) => {
    setBillingRules(prev => prev.filter(rule => rule.id !== id));
    toast({
      title: "Billing Rule Deleted",
      description: "Billing rule has been deleted successfully."
    });
  };

  const createTransaction = (transaction: Omit<BillingTransaction, 'id' | 'createdAt'>) => {
    const newTransaction: BillingTransaction = {
      ...transaction,
      id: `TXN${String(transactions.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setTransactions(prev => [...prev, newTransaction]);
    toast({
      title: "Transaction Created",
      description: "New billing transaction has been created successfully."
    });
  };

  const updateTransactionStatus = (id: string, status: BillingTransaction['status']) => {
    setTransactions(prev => prev.map(transaction => 
      transaction.id === id ? { ...transaction, status } : transaction
    ));
    toast({
      title: "Transaction Updated",
      description: "Transaction status has been updated successfully."
    });
  };

  const createInsuranceClaim = (claim: Omit<InsuranceClaim, 'id' | 'createdAt'>) => {
    const newClaim: InsuranceClaim = {
      ...claim,
      id: `IC${String(insuranceClaims.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setInsuranceClaims(prev => [...prev, newClaim]);
    toast({
      title: "Insurance Claim Created",
      description: "New insurance claim has been created successfully."
    });
  };

  const updateInsuranceClaimStatus = (id: string, status: InsuranceClaim['status'], processedDate?: string) => {
    setInsuranceClaims(prev => prev.map(claim => 
      claim.id === id ? { 
        ...claim, 
        status, 
        processedDate: processedDate || new Date().toISOString().split('T')[0]
      } : claim
    ));
    toast({
      title: "Insurance Claim Updated",
      description: "Insurance claim status has been updated successfully."
    });
  };

  return {
    billingRules: filteredBillingRules,
    transactions: filteredTransactions,
    insuranceClaims: filteredInsuranceClaims,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedStatus,
    setSelectedStatus,
    createBillingRule,
    updateBillingRule,
    deleteBillingRule,
    createTransaction,
    updateTransactionStatus,
    createInsuranceClaim,
    updateInsuranceClaimStatus
  };
};
