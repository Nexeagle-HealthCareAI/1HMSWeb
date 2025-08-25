import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export const ShiftDetailsCard: React.FC = () => {
  return (
    <Card className="h-fit bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 lg:max-w-xs">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <Clock className="h-4 w-4 text-blue-600" />
          Shift Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Default Shifts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-900 dark:text-white">Default Shifts</h4>
            <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 p-1.5 bg-blue-50 rounded-md border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-medium text-blue-900">Morning</span>
              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300 px-1 py-0">
                9AM-2PM
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 bg-green-50 rounded-md border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs font-medium text-green-900">Evening</span>
              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300 px-1 py-0">
                2PM-7PM
              </Badge>
            </div>
          </div>
        </div>

        {/* Personalized Shifts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-900 dark:text-white">Personalized</h4>
            <CheckCircle className="h-3 w-3 text-green-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 p-1.5 bg-purple-50 rounded-md border border-purple-200">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-xs font-medium text-purple-900">Custom</span>
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300 px-1 py-0">
                Override
              </Badge>
            </div>
          </div>
        </div>

        {/* Unavailable Periods */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-900 dark:text-white">Unavailable</h4>
            <AlertTriangle className="h-3 w-3 text-red-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 p-1.5 bg-red-50 rounded-md border border-red-200">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs font-medium text-red-900">Time Off</span>
              <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300 px-1 py-0">
                Blocked
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 bg-orange-50 rounded-md border border-orange-200">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-xs font-medium text-orange-900">Break</span>
              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300 px-1 py-0">
                1PM-2PM
              </Badge>
            </div>
          </div>
        </div>

        {/* Color Legend */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
          <h5 className="text-xs font-medium text-gray-900 dark:text-white mb-2">Color Legend</h5>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Working hours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Unavailable periods</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Personalized schedules</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
