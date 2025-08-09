import React, { useState } from 'react';
import { 
  MessageSquare,
  Users,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: 'appointment' | 'reminder' | 'promotional' | 'general';
  isActive: boolean;
  createdAt: string;
}

interface MessageCampaign {
  id: string;
  name: string;
  template: string;
  recipients: number;
  sent: number;
  failed: number;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
}

// Sample data
const sampleTemplates: MessageTemplate[] = [
  {
    id: 'T001',
    name: 'Appointment Reminder',
    subject: 'Your appointment reminder',
    content: 'Dear {patientName}, this is a reminder for your appointment on {appointmentDate} at {appointmentTime}. Please arrive 15 minutes early.',
    category: 'reminder',
    isActive: true,
    createdAt: '2024-01-15'
  },
  {
    id: 'T002',
    name: 'Health Check Promotion',
    subject: 'Special health check offer',
    content: 'Dear {patientName}, we are offering a special health check package at 20% discount. Book your appointment today!',
    category: 'promotional',
    isActive: true,
    createdAt: '2024-01-14'
  },
  {
    id: 'T003',
    name: 'General Update',
    subject: 'Hospital update',
    content: 'Dear {patientName}, we have updated our services. Please visit our website for more information.',
    category: 'general',
    isActive: false,
    createdAt: '2024-01-13'
  }
];

const sampleCampaigns: MessageCampaign[] = [
  {
    id: 'C001',
    name: 'January Appointment Reminders',
    template: 'Appointment Reminder',
    recipients: 150,
    sent: 145,
    failed: 5,
    status: 'completed',
    sentAt: '2024-01-15 10:30:00',
    createdAt: '2024-01-15'
  },
  {
    id: 'C002',
    name: 'Health Check Promotion',
    template: 'Health Check Promotion',
    recipients: 200,
    sent: 180,
    failed: 20,
    status: 'completed',
    sentAt: '2024-01-14 14:20:00',
    createdAt: '2024-01-14'
  },
  {
    id: 'C003',
    name: 'February Reminders',
    template: 'Appointment Reminder',
    recipients: 100,
    sent: 0,
    failed: 0,
    status: 'scheduled',
    scheduledAt: '2024-02-01 09:00:00',
    createdAt: '2024-01-16'
  }
];

import { useBulkMessaging } from '../hooks';

export const BulkMessaging: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    templates,
    campaigns,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign
  } = useBulkMessaging();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: FileText },
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      sending: { color: 'bg-yellow-100 text-yellow-800', icon: Send },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || AlertCircle;

    return (
      <Badge className={config?.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateTemplate = () => {
    createTemplate({
      name: 'New Template',
      subject: 'Template Subject',
      content: 'Template content here...',
      category: 'general',
      isActive: true
    });
  };

  const handleCreateCampaign = () => {
    createCampaign({
      name: 'New Campaign',
      template: 'Default Template',
      recipients: 0,
      status: 'draft'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Bulk Messaging</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Message Templates</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span>Campaigns</span>
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </div>

            <div className="grid gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{template.subject}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{template.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Created: {template.createdAt}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Message Campaigns</h3>
              <Button onClick={handleCreateCampaign} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Campaign
              </Button>
            </div>

            <div className="grid gap-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">Template: {campaign.template}</p>
                      </div>
                      {getStatusBadge(campaign.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{campaign.recipients}</div>
                        <div className="text-sm text-muted-foreground">Recipients</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{campaign.sent}</div>
                        <div className="text-sm text-muted-foreground">Sent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{campaign.failed}</div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Created: {campaign.createdAt}
                        {campaign.scheduledAt && ` | Scheduled: ${campaign.scheduledAt}`}
                        {campaign.sentAt && ` | Sent: ${campaign.sentAt}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
