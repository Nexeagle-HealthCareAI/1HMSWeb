import React, { useState } from 'react';
import { Settings, Plus, Edit, Trash2, Save, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface ServicePricing {
  id: string;
  category: string;
  service: string;
  privatePrice: number;
  generalPrice: number;
  insurancePrice: number;
  corporatePrice: number;
  department: string;
}

interface BillingRule {
  id: string;
  name: string;
  taxPercentage: number;
  discountRules: {
    seniorCitizen: number;
    staff: number;
    emergency: number;
  };
  roundOffSettings: boolean;
  autoBundling: boolean;
  insuranceCoPayPercentage: number;
}

const sampleServices: ServicePricing[] = [
  {
    id: 'S001',
    category: 'OPD',
    service: 'General Consultation',
    privatePrice: 800,
    generalPrice: 500,
    insurancePrice: 600,
    corporatePrice: 750,
    department: 'General Medicine'
  },
  {
    id: 'S002',
    category: 'Lab',
    service: 'Complete Blood Count',
    privatePrice: 400,
    generalPrice: 300,
    insurancePrice: 350,
    corporatePrice: 380,
    department: 'Pathology'
  }
];

const sampleBillingRules: BillingRule[] = [
  {
    id: 'BR001',
    name: 'Standard Billing',
    taxPercentage: 18,
    discountRules: {
      seniorCitizen: 10,
      staff: 20,
      emergency: 0
    },
    roundOffSettings: true,
    autoBundling: true,
    insuranceCoPayPercentage: 10
  }
];

export const BillingConfiguration: React.FC = () => {
  const [services, setServices] = useState<ServicePricing[]>(sampleServices);
  const [billingRules, setBillingRules] = useState<BillingRule[]>(sampleBillingRules);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingService, setEditingService] = useState<ServicePricing | null>(null);
  const [editingRule, setEditingRule] = useState<BillingRule | null>(null);
  const { toast } = useToast();

  const [newService, setNewService] = useState<Partial<ServicePricing>>({
    category: 'OPD',
    service: '',
    privatePrice: 0,
    generalPrice: 0,
    insurancePrice: 0,
    corporatePrice: 0,
    department: ''
  });

  const [newRule, setNewRule] = useState<Partial<BillingRule>>({
    name: '',
    taxPercentage: 18,
    discountRules: {
      seniorCitizen: 0,
      staff: 0,
      emergency: 0
    },
    roundOffSettings: true,
    autoBundling: false,
    insuranceCoPayPercentage: 0
  });

  const handleSaveService = () => {
    if (editingService) {
      setServices(prev => prev.map(s => s.id === editingService.id ? { ...editingService } : s));
      toast({ title: "Service Updated", description: "Service pricing has been updated successfully." });
    } else {
      const service: ServicePricing = {
        id: `S${String(services.length + 1).padStart(3, '0')}`,
        ...newService as ServicePricing
      };
      setServices(prev => [...prev, service]);
      toast({ title: "Service Added", description: "New service pricing has been added successfully." });
    }
    
    setShowServiceDialog(false);
    setEditingService(null);
    setNewService({
      category: 'OPD',
      service: '',
      privatePrice: 0,
      generalPrice: 0,
      insurancePrice: 0,
      corporatePrice: 0,
      department: ''
    });
  };

  const handleSaveRule = () => {
    if (editingRule) {
      setBillingRules(prev => prev.map(r => r.id === editingRule.id ? { ...editingRule } : r));
      toast({ title: "Billing Rule Updated", description: "Billing rule has been updated successfully." });
    } else {
      const rule: BillingRule = {
        id: `BR${String(billingRules.length + 1).padStart(3, '0')}`,
        ...newRule as BillingRule
      };
      setBillingRules(prev => [...prev, rule]);
      toast({ title: "Billing Rule Added", description: "New billing rule has been added successfully." });
    }
    
    setShowRuleDialog(false);
    setEditingRule(null);
    setNewRule({
      name: '',
      taxPercentage: 18,
      discountRules: {
        seniorCitizen: 0,
        staff: 0,
        emergency: 0
      },
      roundOffSettings: true,
      autoBundling: false,
      insuranceCoPayPercentage: 0
    });
  };

  const handleEditService = (service: ServicePricing) => {
    setEditingService(service);
    setShowServiceDialog(true);
  };

  const handleEditRule = (rule: BillingRule) => {
    setEditingRule(rule);
    setShowRuleDialog(true);
  };

  const handleDeleteService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
    toast({ title: "Service Deleted", description: "Service has been removed successfully." });
  };

  const handleCloneRule = (rule: BillingRule) => {
    const clonedRule: BillingRule = {
      ...rule,
      id: `BR${String(billingRules.length + 1).padStart(3, '0')}`,
      name: `${rule.name} (Copy)`
    };
    setBillingRules(prev => [...prev, clonedRule]);
    toast({ title: "Rule Cloned", description: "Billing rule has been cloned successfully." });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Billing Configuration</h2>
          <p className="text-muted-foreground">Configure pricing, taxes, and billing rules</p>
        </div>
      </div>

      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pricing">Service Pricing</TabsTrigger>
          <TabsTrigger value="rules">Billing Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Service Pricing Management</h3>
            <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select 
                        value={editingService?.category || newService.category} 
                        onValueChange={(value) => editingService ? 
                          setEditingService({...editingService, category: value}) : 
                          setNewService(prev => ({...prev, category: value}))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPD">OPD Consultation</SelectItem>
                          <SelectItem value="IPD">IPD Services</SelectItem>
                          <SelectItem value="Lab">Laboratory</SelectItem>
                          <SelectItem value="Radiology">Radiology</SelectItem>
                          <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                          <SelectItem value="Room">Room Charges</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Department</Label>
                      <Input
                        value={editingService?.department || newService.department}
                        onChange={(e) => editingService ? 
                          setEditingService({...editingService, department: e.target.value}) : 
                          setNewService(prev => ({...prev, department: e.target.value}))
                        }
                        placeholder="Enter department"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Service Name</Label>
                    <Input
                      value={editingService?.service || newService.service}
                      onChange={(e) => editingService ? 
                        setEditingService({...editingService, service: e.target.value}) : 
                        setNewService(prev => ({...prev, service: e.target.value}))
                      }
                      placeholder="Enter service name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Private Price (₹)</Label>
                      <Input
                        type="number"
                        value={editingService?.privatePrice || newService.privatePrice}
                        onChange={(e) => editingService ? 
                          setEditingService({...editingService, privatePrice: Number(e.target.value)}) : 
                          setNewService(prev => ({...prev, privatePrice: Number(e.target.value)}))
                        }
                      />
                    </div>
                    <div>
                      <Label>General Price (₹)</Label>
                      <Input
                        type="number"
                        value={editingService?.generalPrice || newService.generalPrice}
                        onChange={(e) => editingService ? 
                          setEditingService({...editingService, generalPrice: Number(e.target.value)}) : 
                          setNewService(prev => ({...prev, generalPrice: Number(e.target.value)}))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Insurance Price (₹)</Label>
                      <Input
                        type="number"
                        value={editingService?.insurancePrice || newService.insurancePrice}
                        onChange={(e) => editingService ? 
                          setEditingService({...editingService, insurancePrice: Number(e.target.value)}) : 
                          setNewService(prev => ({...prev, insurancePrice: Number(e.target.value)}))
                        }
                      />
                    </div>
                    <div>
                      <Label>Corporate Price (₹)</Label>
                      <Input
                        type="number"
                        value={editingService?.corporatePrice || newService.corporatePrice}
                        onChange={(e) => editingService ? 
                          setEditingService({...editingService, corporatePrice: Number(e.target.value)}) : 
                          setNewService(prev => ({...prev, corporatePrice: Number(e.target.value)}))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveService} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      {editingService ? 'Update Service' : 'Add Service'}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setShowServiceDialog(false);
                      setEditingService(null);
                    }} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold">Service</th>
                      <th className="text-left p-4 font-semibold">Category</th>
                      <th className="text-left p-4 font-semibold">Department</th>
                      <th className="text-left p-4 font-semibold">Private</th>
                      <th className="text-left p-4 font-semibold">General</th>
                      <th className="text-left p-4 font-semibold">Insurance</th>
                      <th className="text-left p-4 font-semibold">Corporate</th>
                      <th className="text-left p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr key={service.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 font-medium">{service.service}</td>
                        <td className="p-4">{service.category}</td>
                        <td className="p-4">{service.department}</td>
                        <td className="p-4">₹{service.privatePrice}</td>
                        <td className="p-4">₹{service.generalPrice}</td>
                        <td className="p-4">₹{service.insurancePrice}</td>
                        <td className="p-4">₹{service.corporatePrice}</td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleEditService(service)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteService(service.id)}>
                              <Trash2 className="h-3 w-3" />
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
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Billing Rules Management</h3>
            <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingRule ? 'Edit Billing Rule' : 'Add New Billing Rule'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Rule Name</Label>
                    <Input
                      value={editingRule?.name || newRule.name}
                      onChange={(e) => editingRule ? 
                        setEditingRule({...editingRule, name: e.target.value}) : 
                        setNewRule(prev => ({...prev, name: e.target.value}))
                      }
                      placeholder="Enter rule name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tax Percentage (%)</Label>
                      <Input
                        type="number"
                        value={editingRule?.taxPercentage || newRule.taxPercentage}
                        onChange={(e) => editingRule ? 
                          setEditingRule({...editingRule, taxPercentage: Number(e.target.value)}) : 
                          setNewRule(prev => ({...prev, taxPercentage: Number(e.target.value)}))
                        }
                      />
                    </div>
                    <div>
                      <Label>Insurance Co-pay (%)</Label>
                      <Input
                        type="number"
                        value={editingRule?.insuranceCoPayPercentage || newRule.insuranceCoPayPercentage}
                        onChange={(e) => editingRule ? 
                          setEditingRule({...editingRule, insuranceCoPayPercentage: Number(e.target.value)}) : 
                          setNewRule(prev => ({...prev, insuranceCoPayPercentage: Number(e.target.value)}))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Discount Rules (%)</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div>
                        <Label className="text-sm">Senior Citizen</Label>
                        <Input
                          type="number"
                          value={editingRule?.discountRules.seniorCitizen || newRule.discountRules?.seniorCitizen}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (editingRule) {
                              setEditingRule({...editingRule, discountRules: {...editingRule.discountRules, seniorCitizen: value}});
                            } else {
                              setNewRule(prev => ({...prev, discountRules: {...prev.discountRules!, seniorCitizen: value}}));
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Staff Discount</Label>
                        <Input
                          type="number"
                          value={editingRule?.discountRules.staff || newRule.discountRules?.staff}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (editingRule) {
                              setEditingRule({...editingRule, discountRules: {...editingRule.discountRules, staff: value}});
                            } else {
                              setNewRule(prev => ({...prev, discountRules: {...prev.discountRules!, staff: value}}));
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Emergency Discount</Label>
                        <Input
                          type="number"
                          value={editingRule?.discountRules.emergency || newRule.discountRules?.emergency}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (editingRule) {
                              setEditingRule({...editingRule, discountRules: {...editingRule.discountRules, emergency: value}});
                            } else {
                              setNewRule(prev => ({...prev, discountRules: {...prev.discountRules!, emergency: value}}));
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Round-off Settings</Label>
                      <Switch
                        checked={editingRule?.roundOffSettings || newRule.roundOffSettings}
                        onCheckedChange={(checked) => editingRule ? 
                          setEditingRule({...editingRule, roundOffSettings: checked}) : 
                          setNewRule(prev => ({...prev, roundOffSettings: checked}))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Auto Bundling</Label>
                      <Switch
                        checked={editingRule?.autoBundling || newRule.autoBundling}
                        onCheckedChange={(checked) => editingRule ? 
                          setEditingRule({...editingRule, autoBundling: checked}) : 
                          setNewRule(prev => ({...prev, autoBundling: checked}))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveRule} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      {editingRule ? 'Update Rule' : 'Add Rule'}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setShowRuleDialog(false);
                      setEditingRule(null);
                    }} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {billingRules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">Tax: {rule.taxPercentage}% | Co-pay: {rule.insuranceCoPayPercentage}%</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleEditRule(rule)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCloneRule(rule)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Senior Citizen:</span>
                      <div className="font-medium">{rule.discountRules.seniorCitizen}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Staff Discount:</span>
                      <div className="font-medium">{rule.discountRules.staff}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Round-off:</span>
                      <div className="font-medium">{rule.roundOffSettings ? 'Enabled' : 'Disabled'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Auto Bundle:</span>
                      <div className="font-medium">{rule.autoBundling ? 'Enabled' : 'Disabled'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};