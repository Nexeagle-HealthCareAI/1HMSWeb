import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const PathologyBillingTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual Lab Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Create manual invoices for walk-in patients or handle payments for existing orders.
          </p>
          <Button>Create New Invoice</Button>
        </CardContent>
      </Card>
      
      {/* List of recent invoices / payments will go here */}
      <div className="mt-8 border rounded p-4">
        <h3 className="font-semibold text-lg mb-2">Recent Transactions</h3>
        <p className="text-gray-500 italic">No recent transactions to display.</p>
      </div>
    </div>
  );
};
