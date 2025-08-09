import { useState } from 'react';
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

export const useBulkMessaging = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState<MessageTemplate[]>(sampleTemplates);
  const [campaigns, setCampaigns] = useState<MessageCampaign[]>(sampleCampaigns);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const createTemplate = (template: Omit<MessageTemplate, 'id' | 'createdAt'>) => {
    const newTemplate: MessageTemplate = {
      ...template,
      id: `T${String(templates.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setTemplates(prev => [...prev, newTemplate]);
    toast({
      title: "Template Created",
      description: "New message template has been created successfully."
    });
  };

  const updateTemplate = (id: string, updatedTemplate: Partial<MessageTemplate>) => {
    setTemplates(prev => prev.map(template => 
      template.id === id ? { ...template, ...updatedTemplate } : template
    ));
    toast({
      title: "Template Updated",
      description: "Message template has been updated successfully."
    });
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(template => template.id !== id));
    toast({
      title: "Template Deleted",
      description: "Message template has been deleted successfully."
    });
  };

  const createCampaign = (campaign: Omit<MessageCampaign, 'id' | 'createdAt' | 'sent' | 'failed'>) => {
    const newCampaign: MessageCampaign = {
      ...campaign,
      id: `C${String(campaigns.length + 1).padStart(3, '0')}`,
      sent: 0,
      failed: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setCampaigns(prev => [...prev, newCampaign]);
    toast({
      title: "Campaign Created",
      description: "New message campaign has been created successfully."
    });
  };

  const updateCampaign = (id: string, updatedCampaign: Partial<MessageCampaign>) => {
    setCampaigns(prev => prev.map(campaign => 
      campaign.id === id ? { ...campaign, ...updatedCampaign } : campaign
    ));
    toast({
      title: "Campaign Updated",
      description: "Message campaign has been updated successfully."
    });
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(campaign => campaign.id !== id));
    toast({
      title: "Campaign Deleted",
      description: "Message campaign has been deleted successfully."
    });
  };

  const sendCampaign = (id: string) => {
    setCampaigns(prev => prev.map(campaign => {
      if (campaign.id === id) {
        return {
          ...campaign,
          status: 'sending' as const,
          sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
      }
      return campaign;
    }));
    toast({
      title: "Campaign Started",
      description: "Message campaign has been started successfully."
    });
  };

  return {
    activeTab,
    setActiveTab,
    templates: filteredTemplates,
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
  };
};
