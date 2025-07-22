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

// Reset all guides (for development/testing)
export const resetAllGuides = () => {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('guide-dismissed-'));
  keys.forEach(key => localStorage.removeItem(key));
};