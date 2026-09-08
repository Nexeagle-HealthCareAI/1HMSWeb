// Shared badge color for a pathology order's Status -- used by both the dashboard's order cards
// (PathologyWorkspace.tsx) and the order-detail page's header (PathologyOrderDetailPage.tsx), so
// they can't drift apart.
export const getPathologyStatusColor = (status: string): string => {
  switch (status) {
    case 'PLACED': return 'bg-blue-100 text-blue-800';
    case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
    case 'COMPLETED': return 'bg-green-100 text-green-800';
    case 'CANCELLED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Highlights where an order came from -- OPD/IPD orders are clinically-sourced requests a tech
// needs to act on quickly, as opposed to a walk-in/self-added order, so these get a stronger color
// than the plain-text Source column used to show.
export const getPathologySourceColor = (sourceType?: string | null): string => {
  switch (sourceType) {
    case 'OPD': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'IPD': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'EMERGENCY': return 'bg-orange-100 text-orange-800 border-orange-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};
