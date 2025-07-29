import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { UserCheck, Crown } from 'lucide-react';

interface UserTypeSelectionProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  onNext: (selectedType?: string) => void;
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
      benefits: ['Patient Management', 'E-Prescriptions', 'Appointment Booking', 'Billing & Reports', 'Admin Dashboard'],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'Admin Only',
      title: 'Admin Only',
      subtitle: 'Administrative access',
      description: 'Handle appointments, billing, reports and administrative tasks',
      icon: Crown,
      benefits: ['Appointment Management', 'Billing & Invoicing', 'Reports & Analytics', 'User Management', 'System Settings'],
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const handleCardClick = (typeId: string) => {
    console.log('Card clicked:', typeId);
    onSelectType(typeId);
    // Automatically proceed to next step after a short delay for visual feedback
    // Pass the selected type directly to avoid state update timing issues
    setTimeout(() => {
      console.log('Calling onNext with typeId:', typeId);
      onNext(typeId);
    }, 300);
  };

  return (
    <div className="space-y-6">     

      {/* Role Selection Cards */}
      <div className="space-y-4">
        {userTypes.map((type) => (
          <div
            key={type.id}
            onClick={() => handleCardClick(type.id)}
            className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
          >
            <Card className={`border-2 transition-all duration-300 ${
              selectedType === type.id
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-transparent hover:border-blue-300 hover:shadow-lg'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${type.color} shadow-md group-hover:shadow-lg transition-shadow`}>
                    <type.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg transition-colors ${
                      selectedType === type.id ? 'text-blue-600' : 'text-gray-900 group-hover:text-blue-600'
                    }`}>
                      {type.title}
                    </h3>
                    <p className="text-sm text-blue-600 font-medium mb-2">{type.subtitle}</p>
                    <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {type.benefits.slice(0, 3).map((benefit, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                          {benefit}
                        </span>
                      ))}
                      {type.benefits.length > 3 && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                          +{type.benefits.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Loading indicator when processing */}
      {isLoading && (
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-3 text-blue-600">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium">Processing your selection...</span>
          </div>
        </div>
      )}
    </div>
  );
}; 