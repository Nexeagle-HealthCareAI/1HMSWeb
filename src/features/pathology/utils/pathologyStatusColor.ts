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
