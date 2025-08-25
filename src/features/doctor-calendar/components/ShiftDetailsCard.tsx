import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export const ShiftDetailsCard: React.FC = () => {
  return (
    <Card className="h-fit bg-white shadow-lg border border-gray-200 lg:max-w-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Clock className="h-5 w-5 text-blue-600" />
          Shift Details
        </CardTitle>
      </CardHeader>
             <CardContent className="space-y-6">
         {/* Default Shifts */}
         <div className="space-y-3">
           <div className="flex items-center justify-between">
             <h4 className="font-medium text-gray-900">Default Shifts</h4>
             <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
           </div>
           <div className="space-y-2">
             <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
               <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
               <span className="text-sm font-medium text-blue-900">Morning Shift</span>
               <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                 9:00 AM - 2:00 PM
               </Badge>
             </div>
             <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
               <div className="w-3 h-3 bg-green-500 rounded-full"></div>
               <span className="text-sm font-medium text-green-900">Evening Shift</span>
               <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                 2:00 PM - 7:00 PM
               </Badge>
             </div>
           </div>
         </div>

         {/* Personalized Shifts */}
         <div className="space-y-3">
           <div className="flex items-center justify-between">
             <h4 className="font-medium text-gray-900">Personalized Shifts</h4>
             <CheckCircle className="h-4 w-4 text-green-500" />
           </div>
           <div className="space-y-2">
             <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
               <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
               <span className="text-sm font-medium text-purple-900">Custom Schedule</span>
               <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                 Override
               </Badge>
             </div>
           </div>
         </div>

         {/* Unavailable Periods */}
         <div className="space-y-3">
           <div className="flex items-center justify-between">
             <h4 className="font-medium text-gray-900">Unavailable</h4>
             <AlertTriangle className="h-4 w-4 text-red-500" />
           </div>
           <div className="space-y-2">
             <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
               <div className="w-3 h-3 bg-red-500 rounded-full"></div>
               <span className="text-sm font-medium text-red-900">Time Off</span>
               <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300">
                 Blocked
               </Badge>
             </div>
             <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
               <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
               <span className="text-sm font-medium text-orange-900">Break Time</span>
               <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                 1:00 PM - 2:00 PM
               </Badge>
             </div>
           </div>
         </div>

         {/* Color Legend */}
         <div className="pt-4 border-t border-gray-200">
           <h5 className="font-medium text-gray-900 mb-3">Color Legend</h5>
           <div className="space-y-2 text-sm">
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-blue-500 rounded"></div>
               <span className="text-gray-700">Working hours</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-red-500 rounded"></div>
               <span className="text-gray-700">Unavailable periods</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-purple-500 rounded"></div>
               <span className="text-gray-700">Personalized schedules</span>
             </div>
           </div>
         </div>
       </CardContent>
    </Card>
  );
};
