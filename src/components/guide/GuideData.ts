export interface GuideConfig {
  id: string;
  title: string;
  description: string;
  tips?: string[];
  priority: 'high' | 'medium' | 'low';
  showOnMount?: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  triggerMode?: 'hover' | 'click' | 'auto';
}

export const DASHBOARD_GUIDES: Record<string, GuideConfig> = {
  // Navigation guides
  'quick-nav': {
    id: 'quick-nav',
    title: '🚀 Quick Navigation',
    description: 'Access all major sections instantly! Click any button to jump to that module.',
    tips: [
      'Admin Panel contains user management and system settings',
      'Calendar shows your schedule and appointments',
      'DocAI provides medical assistance and insights'
    ],
    priority: 'high',
    showOnMount: true,
    placement: 'bottom',
    triggerMode: 'auto'
  },

  'kpi-cards': {
    id: 'kpi-cards',
    title: '📊 Today\'s Overview',
    description: 'Your daily dashboard shows key metrics at a glance. Green arrows mean good progress!',
    tips: [
      'Click on any card to see detailed reports',
      'Numbers update in real-time',
      'Compare with yesterday\'s performance'
    ],
    priority: 'medium',
    placement: 'top'
  },

  'patient-table': {
    id: 'patient-table',
    title: '👥 Patient Management',
    description: 'See all today\'s appointments here. Click on Patient ID to view full medical records.',
    tips: [
      'Green badges = Confirmed appointments',
      'Red badges = Cancelled appointments',
      'Gray badges = No-show patients',
      'Click Patient ID to create prescriptions'
    ],
    priority: 'high',
    placement: 'top'
  },

  'profile-completion': {
    id: 'profile-completion',
    title: '✨ Complete Your Profile',
    description: 'Finish setting up your profile to unlock all features. The more complete, the better the experience!',
    tips: [
      'Add your specialization for better patient matching',
      'Set working hours for accurate scheduling',
      'Upload your photo for professional appearance'
    ],
    priority: 'high',
    placement: 'bottom'
  },

  'notifications': {
    id: 'notifications',
    title: '🔔 Stay Updated',
    description: 'Never miss important updates! Red dot means you have new notifications.',
    tips: [
      'Appointment confirmations appear here',
      'System alerts and reminders',
      'Patient messages and updates'
    ],
    priority: 'medium',
    placement: 'bottom'
  },

  'language-switcher': {
    id: 'language-switcher',
    title: '🌐 Multi-Language Support',
    description: 'Switch between languages for better accessibility. Perfect for diverse teams!',
    tips: [
      'Choose your preferred language',
      'All interface text will change',
      'Great for multilingual hospitals'
    ],
    priority: 'low',
    placement: 'bottom'
  },

  'sidebar-nav': {
    id: 'sidebar-nav',
    title: '🏠 Main Navigation',
    description: 'Your control center! Each section has powerful features to manage your hospital efficiently.',
    tips: [
      'Dashboard shows daily overview',
      'Admin Panel for system management',
      'Billing handles all financial transactions',
      'Chat enables team communication'
    ],
    priority: 'high',
    placement: 'right'
  }
};

export const APPOINTMENT_GUIDES: Record<string, GuideConfig> = {
  'appointment-scheduler': {
    id: 'appointment-scheduler',
    title: '📅 Smart Scheduling',
    description: 'Book appointments effortlessly! The system automatically checks for conflicts.',
    tips: [
      'Select department first, then doctor',
      'Available slots show in green',
      'System sends automatic confirmations'
    ],
    priority: 'high',
    showOnMount: true,
    placement: 'top'
  },
  'department-selector': {
    id: 'department-selector',
    title: '🏥 Choose Department',
    description: 'Start by selecting the medical department. Each department has specialized doctors.',
    tips: [
      'Popular departments show first',
      'Search to find specific departments',
      'Doctor availability varies by department'
    ],
    priority: 'high',
    placement: 'right'
  },
  'time-slots': {
    id: 'time-slots',
    title: '⏰ Available Times',
    description: 'Pick the perfect time slot! Green means available, gray means taken.',
    tips: [
      'Morning slots fill up quickly',
      'Evening slots available for working patients',
      'Emergency slots reserved for urgent cases'
    ],
    priority: 'medium',
    placement: 'top'
  }
};

export const BILLING_GUIDES: Record<string, GuideConfig> = {
  'billing-dashboard': {
    id: 'billing-dashboard',
    title: '💰 Financial Management',
    description: 'Handle all billing operations seamlessly. Track payments, insurance, and generate reports.',
    tips: [
      'Create bills by selecting services',
      'Process multiple payment methods',
      'Generate reports for analysis'
    ],
    priority: 'high',
    placement: 'top'
  },
  'payment-methods': {
    id: 'payment-methods',
    title: '💳 Payment Options',
    description: 'Multiple payment methods available! Choose what works best for your patients.',
    tips: [
      'Cash payments for immediate settlement',
      'Card payments with instant processing',
      'Insurance claims for covered services',
      'UPI/Digital payments for convenience'
    ],
    priority: 'medium',
    placement: 'right'
  },
  'invoice-generation': {
    id: 'invoice-generation',
    title: '📄 Invoice & Receipt',
    description: 'Generate professional invoices and receipts instantly. All transactions are logged.',
    tips: [
      'Digital receipts via email/SMS',
      'Print invoices for physical records',
      'Auto-calculation of taxes and discounts',
      'Integration with accounting systems'
    ],
    priority: 'medium',
    placement: 'top'
  }
};

// Utility function to get guides for a specific page
export const getPageGuides = (page: string): Record<string, GuideConfig> => {
  switch (page) {
    case 'dashboard':
      return DASHBOARD_GUIDES;
    case 'appointments':
      return APPOINTMENT_GUIDES;
    case 'billing':
      return BILLING_GUIDES;
    default:
      return {};
  }
};

// Admin Panel Guides
export const ADMIN_GUIDES: Record<string, GuideConfig> = {
  'user-management': {
    id: 'user-management',
    title: '👥 User Management',
    description: 'Manage all system users efficiently. Add doctors, staff, and configure their permissions.',
    tips: [
      'Create user accounts with proper roles',
      'Assign permissions based on job functions',
      'Monitor user activity and login history',
      'Bulk upload for multiple users'
    ],
    priority: 'high',
    placement: 'top'
  },
  'system-config': {
    id: 'system-config',
    title: '⚙️ System Settings',
    description: 'Configure hospital settings, departments, and system preferences for optimal operation.',
    tips: [
      'Set up departments and specializations',
      'Configure working hours and schedules',
      'Customize prescription templates',
      'Manage hospital branding and information'
    ],
    priority: 'medium',
    placement: 'right'
  }
};

// DocAI Guides
export const DOCAI_GUIDES: Record<string, GuideConfig> = {
  'ai-assistant': {
    id: 'ai-assistant',
    title: '🤖 AI Medical Assistant',
    description: 'Get intelligent medical assistance! AI can help with diagnoses, drug interactions, and clinical decisions.',
    tips: [
      'Ask about symptoms and possible diagnoses',
      'Check drug interactions and contraindications',
      'Get treatment protocol recommendations',
      'Access medical literature and guidelines'
    ],
    priority: 'high',
    placement: 'top'
  },
  'medical-database': {
    id: 'medical-database',
    title: '📚 Medical Knowledge Base',
    description: 'Access comprehensive medical information instantly. From ICD codes to treatment protocols.',
    tips: [
      'Search by symptoms, conditions, or medications',
      'Get ICD-10 codes automatically',
      'Access drug dosage and interaction information',
      'Find clinical guidelines and protocols'
    ],
    priority: 'medium',
    placement: 'right'
  }
};

// Reset all guides (for development/testing)
export const resetAllGuides = () => {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('guide-dismissed-'));
  keys.forEach(key => localStorage.removeItem(key));
};