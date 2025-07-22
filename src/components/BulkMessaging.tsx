import React, { useState } from 'react';
import { 
  Send, 
  Users, 
  Filter, 
  Plus,
  MessageSquare,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Edit
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';

import { useToast } from '@/hooks/use-toast';

interface Patient {
  id: string;
  name: string;
  phone: string;
  department: string;
  lastVisit: Date;
  followUpDate?: Date;
  diagnosis?: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  type: 'sms' | 'whatsapp';
}

interface BulkMessage {
  id: string;
  templateName: string;
  recipientCount: number;
  sentDate: Date;
  status: 'sent' | 'pending' | 'failed';
  deliveryRate: number;
}

const samplePatients: Patient[] = [
  {
    id: 'P001',
    name: 'John Doe',
    phone: '+91-9876543210',
    department: 'Cardiology',
    lastVisit: new Date('2024-01-10'),
    followUpDate: new Date('2024-01-20'),
    diagnosis: 'Hypertension'
  },
  {
    id: 'P002',
    name: 'Jane Smith',
    phone: '+91-9876543211',
    department: 'Neurology',
    lastVisit: new Date('2024-01-12'),
    followUpDate: new Date('2024-01-22'),
    diagnosis: 'Migraine'
  },
  {
    id: 'P003',
    name: 'Robert Wilson',
    phone: '+91-9876543212',
    department: 'General Medicine',
    lastVisit: new Date('2024-01-08'),
    diagnosis: 'Diabetes'
  }
];

const messageTemplates: MessageTemplate[] = [
  {
    id: '1',
    name: 'Appointment Reminder',
    content: 'Dear {name}, this is a reminder for your appointment on {date} at {time} with {doctor}. Please arrive 15 minutes early.',
    type: 'sms'
  },
  {
    id: '2',
    name: 'Follow-up Required',
    content: 'Hello {name}, it\'s time for your follow-up visit. Please call us at 123-456-7890 to schedule your appointment.',
    type: 'whatsapp'
  },
  {
    id: '3',
    name: 'Lab Results Ready',
    content: 'Dear {name}, your lab results are ready. Please visit the hospital or call us to discuss the results with your doctor.',
    type: 'sms'
  },
  {
    id: '4',
    name: 'Health Tips',
    content: 'Stay healthy! Remember to take your medications on time, exercise regularly, and maintain a balanced diet. - {hospitalName}',
    type: 'whatsapp'
  }
];

const recentMessages: BulkMessage[] = [
  {
    id: '1',
    templateName: 'Appointment Reminder',
    recipientCount: 45,
    sentDate: new Date('2024-01-15'),
    status: 'sent',
    deliveryRate: 98
  },
  {
    id: '2',
    templateName: 'Follow-up Required',
    recipientCount: 32,
    sentDate: new Date('2024-01-14'),
    status: 'sent',
    deliveryRate: 95
  },
  {
    id: '3',
    templateName: 'Lab Results Ready',
    recipientCount: 18,
    sentDate: new Date('2024-01-13'),
    status: 'pending',
    deliveryRate: 0
  }
];

export const BulkMessaging: React.FC = () => {
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterFollowUp, setFilterFollowUp] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [messageType, setMessageType] = useState<'sms' | 'whatsapp'>('sms');
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const { toast } = useToast();

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    type: 'sms' as 'sms' | 'whatsapp'
  });

  const handlePatientSelect = (patientId: string, checked: boolean) => {
    if (checked) {
      setSelectedPatients(prev => [...prev, patientId]);
    } else {
      setSelectedPatients(prev => prev.filter(id => id !== patientId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPatients(filteredPatients.map(p => p.id));
    } else {
      setSelectedPatients([]);
    }
  };

  const filteredPatients = samplePatients.filter(patient => {
    const departmentMatch = filterDepartment === 'all' || patient.department === filterDepartment;
    
    let followUpMatch = true;
    if (filterFollowUp === 'due') {
      followUpMatch = patient.followUpDate && patient.followUpDate <= new Date();
    } else if (filterFollowUp === 'overdue') {
      followUpMatch = patient.followUpDate && patient.followUpDate < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return departmentMatch && followUpMatch;
  });

  const handleSendMessage = () => {
    if (selectedPatients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please select at least one patient to send messages.",
        variant: "destructive"
      });
      return;
    }

    const message = selectedTemplate ? selectedTemplate.content : customMessage;
    if (!message.trim()) {
      toast({
        title: "No Message",
        description: "Please select a template or write a custom message.",
        variant: "destructive"
      });
      return;
    }

    // Simulate sending
    toast({
      title: "Messages Sent",
      description: `Successfully sent ${messageType.toUpperCase()} messages to ${selectedPatients.length} patients.`,
    });

    setSelectedPatients([]);
    setSelectedTemplate(null);
    setCustomMessage('');
    setShowSendDialog(false);
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast({
        title: "Missing Information",
        description: "Please provide both template name and content.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Template Created",
      description: `Template "${newTemplate.name}" has been created successfully.`,
    });

    setNewTemplate({ name: '', content: '', type: 'sms' });
    setShowNewTemplate(false);
  };

  const getStatusBadge = (status: BulkMessage['status']) => {
    const variants = {
      sent: 'default',
      pending: 'secondary',
      failed: 'destructive'
    };
    const icons = {
      sent: CheckCircle,
      pending: Clock,
      failed: XCircle
    };
    const Icon = icons[status];
    return (
      <Badge variant={variants[status] as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bulk Messaging</h1>
          <p className="text-muted-foreground">Send SMS and WhatsApp messages to multiple patients</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showNewTemplate} onOpenChange={setShowNewTemplate}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Message Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <Label htmlFor="templateType">Message Type</Label>
                  <Select 
                    value={newTemplate.type} 
                    onValueChange={(value: 'sms' | 'whatsapp') => setNewTemplate(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="templateContent">Message Content</Label>
                  <Textarea
                    id="templateContent"
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter message content. Use {name}, {date}, {doctor}, etc. for dynamic content"
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateTemplate} className="flex-1">Create Template</Button>
                  <Button variant="outline" onClick={() => setShowNewTemplate(false)} className="flex-1">Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mobile Message Composer - Show first on mobile */}
        <div className="lg:hidden order-1">
          <Card>
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Message Type</Label>
                <Select value={messageType} onValueChange={(value: 'sms' | 'whatsapp') => setMessageType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Message Templates</Label>
                <div className="space-y-2 mt-2">
                  {messageTemplates
                    .filter(template => template.type === messageType)
                    .map((template) => (
                      <div
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setCustomMessage('');
                        }}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id 
                            ? 'bg-healthcare-primary/10 border-healthcare-primary' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.content}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <Label htmlFor="customMessage">Or Write Custom Message</Label>
                <Textarea
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => {
                    setCustomMessage(e.target.value);
                    if (e.target.value) setSelectedTemplate(null);
                  }}
                  placeholder="Write your custom message here..."
                  rows={4}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Selected recipients: {selectedPatients.length}</p>
                <p>Message type: {messageType.toUpperCase()}</p>
              </div>

              <Button 
                onClick={() => setShowSendDialog(true)} 
                className="w-full gap-2"
                disabled={selectedPatients.length === 0 || (!selectedTemplate && !customMessage.trim())}
              >
                <Send className="h-4 w-4" />
                Send Messages
              </Button>
            </CardContent>
          </Card>
        </div>
        {/* Patient Selection */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Select Recipients</CardTitle>
                <div className="flex gap-2">
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="Cardiology">Cardiology</SelectItem>
                      <SelectItem value="Neurology">Neurology</SelectItem>
                      <SelectItem value="General Medicine">General Medicine</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterFollowUp} onValueChange={setFilterFollowUp}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Patients</SelectItem>
                      <SelectItem value="due">Follow-up Due</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedPatients.length === filteredPatients.length && filteredPatients.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label className="text-sm font-medium">
                    Select All ({filteredPatients.length} patients)
                  </Label>
                </div>
                
                {filteredPatients.map((patient) => (
                  <div key={patient.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedPatients.includes(patient.id)}
                      onCheckedChange={(checked) => handlePatientSelect(patient.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{patient.name}</h4>
                          <p className="text-sm text-muted-foreground">{patient.phone}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{patient.department}</Badge>
                          {patient.followUpDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Follow-up: {patient.followUpDate.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop Message Composer */}
        <div className="hidden lg:block order-3 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Message Type</Label>
                <Select value={messageType} onValueChange={(value: 'sms' | 'whatsapp') => setMessageType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Message Templates</Label>
                <div className="space-y-2 mt-2">
                  {messageTemplates
                    .filter(template => template.type === messageType)
                    .map((template) => (
                      <div
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setCustomMessage('');
                        }}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id 
                            ? 'bg-healthcare-primary/10 border-healthcare-primary' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.content}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <Label htmlFor="customMessage">Or Write Custom Message</Label>
                <Textarea
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => {
                    setCustomMessage(e.target.value);
                    if (e.target.value) setSelectedTemplate(null);
                  }}
                  placeholder="Write your custom message here..."
                  rows={4}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Selected recipients: {selectedPatients.length}</p>
                <p>Message type: {messageType.toUpperCase()}</p>
              </div>

              <Button 
                onClick={() => setShowSendDialog(true)} 
                className="w-full gap-2"
                disabled={selectedPatients.length === 0 || (!selectedTemplate && !customMessage.trim())}
              >
                <Send className="h-4 w-4" />
                Send Messages
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bulk Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block space-y-3">
            {recentMessages.map((message) => (
              <div key={message.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{message.templateName}</h4>
                    {getStatusBadge(message.status)}
                  </div>
                  <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{message.recipientCount} recipients</span>
                    <span>{message.sentDate.toLocaleDateString()}</span>
                    {message.status === 'sent' && (
                      <span>{message.deliveryRate}% delivered</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {recentMessages.map((message) => (
              <Card key={message.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium">{message.templateName}</h4>
                    <p className="text-sm text-muted-foreground">{message.recipientCount} recipients</p>
                  </div>
                  {getStatusBadge(message.status)}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{message.sentDate.toLocaleDateString()}</span>
                  </div>
                  {message.status === 'sent' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery:</span>
                      <span>{message.deliveryRate}%</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Send Confirmation Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Send Messages</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Message Preview:</h4>
              <p className="text-sm">
                {selectedTemplate ? selectedTemplate.content : customMessage}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Recipients:</span>
                <span className="font-medium ml-2">{selectedPatients.length} patients</span>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium ml-2">{messageType.toUpperCase()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendMessage} className="flex-1">
                Confirm & Send
              </Button>
              <Button variant="outline" onClick={() => setShowSendDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};