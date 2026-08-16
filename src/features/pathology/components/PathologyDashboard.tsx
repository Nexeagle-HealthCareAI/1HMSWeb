import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PathologyBillingTab } from './PathologyBillingTab';
import { PathologyWorkspace } from './PathologyWorkspace';

export const PathologyDashboard: React.FC = () => {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pathology Lab</h1>
          <p className="text-muted-foreground">Manage orders and results.</p>
        </div>
      </div>

      <Tabs defaultValue="workspace" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none px-0 h-12 bg-transparent">
          <TabsTrigger
            value="workspace"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none bg-transparent"
          >
            Workspace
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none bg-transparent"
          >
            Billing & Invoices
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 mt-4 overflow-auto">
          <TabsContent value="workspace" className="h-full m-0">
            <PathologyWorkspace />
          </TabsContent>
          <TabsContent value="billing" className="h-full m-0">
            <PathologyBillingTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
