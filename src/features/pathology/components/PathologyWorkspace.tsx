import React, { useState, useEffect } from 'react';
import { pathologyService, PathologyOrderDto, PathologyOrderLineDto } from '../services/pathologyService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderResultEntry } from './OrderResultEntry';

export const PathologyWorkspace: React.FC = () => {
  const [orders, setOrders] = useState<PathologyOrderDto[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<PathologyOrderDto | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      // Fetch all for now, or could default to PENDING/IN_PROGRESS
      const data = await pathologyService.getOrders();
      setOrders(data);
    } catch (e) {
      console.error("Failed to fetch orders", e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleOrderSelect = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsLoadingDetails(true);
    try {
      const details = await pathologyService.getOrderById(orderId);
      setSelectedOrderDetails(details);
    } catch (e) {
      console.error("Failed to fetch order details", e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PLACED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* Order List */}
      <div className="col-span-4 border rounded-lg flex flex-col h-[calc(100vh-220px)] bg-card">
        <div className="p-4 border-b bg-muted/20">
          <h2 className="font-semibold text-lg">Orders Inbox</h2>
        </div>
        <ScrollArea className="flex-1">
          {isLoadingOrders ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              ))}
            </div>
          ) : orders.length > 0 ? (
            <div className="p-2 space-y-2">
              {orders.map((order) => (
                <div
                  key={order.orderId}
                  onClick={() => handleOrderSelect(order.orderId)}
                  className={`p-4 rounded-md cursor-pointer border transition-colors ${
                    selectedOrderId === order.orderId
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm">{order.orderNo}</span>
                    <Badge variant="outline" className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">{order.patientName}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(order.orderDate).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No pending orders.
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Order Details & Result Entry */}
      <div className="col-span-8 flex flex-col h-[calc(100vh-220px)]">
        {selectedOrderId ? (
          isLoadingDetails ? (
            <div className="flex-1 flex items-center justify-center">
              <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
          ) : selectedOrderDetails ? (
            <ScrollArea className="flex-1 pr-4">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight mb-2">
                  Order {selectedOrderDetails.orderNo}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>Patient: <span className="font-medium text-foreground">{selectedOrderDetails.patientName}</span></span>
                  <span>•</span>
                  <span>Date: {new Date(selectedOrderDetails.orderDate).toLocaleString()}</span>
                  <span>•</span>
                  <Badge variant="outline" className={getStatusColor(selectedOrderDetails.status)}>
                    {selectedOrderDetails.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold border-b pb-2">Tests & Results</h3>
                {selectedOrderDetails.lines.length > 0 ? (
                  selectedOrderDetails.lines.map((line) => (
                    <OrderResultEntry
                      key={line.orderLineId}
                      orderId={selectedOrderDetails.orderId}
                      orderLine={line}
                      onSuccess={() => handleOrderSelect(selectedOrderDetails.orderId)}
                    />
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No tests found in this order.
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : null
        ) : (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
            Select an order from the list to view details and enter results.
          </div>
        )}
      </div>
    </div>
  );
};
