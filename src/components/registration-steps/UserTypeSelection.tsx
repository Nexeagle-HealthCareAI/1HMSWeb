import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserCheck, Crown } from 'lucide-react';

interface UserTypeSelectionProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  onNext: () => void;
  isLoading: boolean;
}

export const UserTypeSelection: React.FC<UserTypeSelectionProps> = ({
  selectedType,
  onSelectType,
  onNext,
  isLoading
}) => {
  const userTypes = [
    {
      id: 'Doctor & Admin',
      title: 'Doctor & Admin',
      subtitle: 'Full access to all features',
      description: 'Manage patients, appointments, prescriptions, billing & admin functions',
      icon: UserCheck,
      features: ['Patient Management', 'E-Prescriptions', 'Appointment Booking', 'Billing & Admin'],
      color: 'from-blue-500 to-blue-600',
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'Admin Only',
      title: 'Admin Only',
      subtitle: 'Administrative access',
      description: 'Handle appointments, billing, reports and administrative tasks',
      icon: Crown,
      features: ['Appointment Management', 'Billing & Invoicing', 'Reports & Analytics', 'Staff Management'],
      color: 'from-purple-500 to-purple-600',
      iconColor: 'text-purple-600',
      bgColor: 'bg-white'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Choose Your Role</h1>
        <p className="text-sm text-gray-600">Select the access level that suits you best</p>
      </div>

      {/* Role Selection Cards */}
      <div className="space-y-3">
        {userTypes.map((type) => (
          <Card
            key={type.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
              selectedType === type.id
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            onClick={() => onSelectType(type.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${type.color} text-white flex-shrink-0`}>
                  <type.icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold mb-1 ${
                    selectedType === type.id ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {type.title}
                  </h3>
                  <p className={`text-xs font-medium mb-1 ${
                    selectedType === type.id ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {type.subtitle}
                  </p>
                  <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                    {type.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    {type.features.slice(0, 2).map((feature, index) => (
                      <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {feature}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                      +{type.features.length - 2} more
                    </span>
                  </div>
                </div>
                
                {selectedType === type.id && (
                  <div className="h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="h-1.5 w-1.5 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Continue Button */}
      <div className="pt-2">
        <Button
          onClick={onNext}
          disabled={!selectedType || isLoading}
          className="w-full h-10 bg-primary text-white font-medium text-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing...
            </div>
          ) : (
            'Continue to Mobile Verification'
          )}
        </Button>
      </div>
    </div>
  );
}; 