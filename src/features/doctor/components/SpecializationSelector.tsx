import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { X, Plus, Search, Check } from 'lucide-react';
import { useSpecializationApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';

interface SpecializationSelectorProps {
  departmentId: string;
  departmentName: string;
  selectedSpecializations: string[];
  onSpecializationsChange: (specializations: string[]) => void;
  disabled?: boolean;
}

export const SpecializationSelector: React.FC<SpecializationSelectorProps> = ({
  departmentId,
  departmentName,
  selectedSpecializations,
  onSpecializationsChange,
  disabled = false
}) => {
  const [customSpecialization, setCustomSpecialization] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const hospitalId = useAuthStore((state) => state.hospitalId);
  
  // Fetch specializations based on department
  const { data: specializationsResponse, isLoading: specializationsLoading, error: specializationsError } = 
    useSpecializationApi.getSpecializationsByDepartment(departmentId, hospitalId || '', true);

  const availableSpecializations = specializationsResponse?.items || [];
  const filteredSpecializations = availableSpecializations.filter(spec =>
    spec.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedSpecializations.includes(spec.name)
  );

  const handleAddSpecialization = (specialization: string) => {
    if (specialization.trim() && !selectedSpecializations.includes(specialization.trim())) {
      onSpecializationsChange([...selectedSpecializations, specialization.trim()]);
    }
  };

  const handleRemoveSpecialization = (specialization: string) => {
    onSpecializationsChange(selectedSpecializations.filter(s => s !== specialization));
  };

  const handleAddCustomSpecialization = () => {
    if (customSpecialization.trim()) {
      handleAddSpecialization(customSpecialization);
      setCustomSpecialization('');
      setShowCustomInput(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomSpecialization();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="specializations">Specializations</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Select from available specializations or add custom ones for {departmentName}
        </p>
      </div>

      {/* Selected Specializations */}
      {selectedSpecializations.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Selected Specializations</Label>
          <div className="flex flex-wrap gap-2">
            {selectedSpecializations.map((spec, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1"
              >
                <Check className="h-3 w-3 text-green-600" />
                {spec}
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-red-100 hover:text-red-600"
                    onClick={() => handleRemoveSpecialization(spec)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Available Specializations Dropdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Available Specializations</Label>
          {availableSpecializations.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {filteredSpecializations.length} of {availableSpecializations.length} available
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search specializations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            disabled={disabled || specializationsLoading}
          />
        </div>
        
        {specializationsLoading ? (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
            Loading specializations...
          </div>
        ) : specializationsError ? (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            Failed to load specializations. You can still add custom ones.
          </div>
        ) : (
          <Card className="max-h-48 overflow-y-auto">
            <CardContent className="p-2">
              {filteredSpecializations.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {searchTerm ? (
                    <div>
                      <p>No specializations found for "{searchTerm}"</p>
                      <p className="text-xs mt-1">Try a different search term or add a custom specialization</p>
                    </div>
                  ) : (
                    <div>
                      <p>No specializations available for this department</p>
                      <p className="text-xs mt-1">You can add custom specializations below</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredSpecializations.map((spec) => (
                    <Button
                      key={spec.specializationId}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto p-2 hover:bg-accent"
                      onClick={() => handleAddSpecialization(spec.name)}
                      disabled={disabled}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{spec.name}</span>
                        {spec.description && (
                          <span className="text-xs text-muted-foreground">{spec.description}</span>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Custom Specialization Input */}
      {!disabled && (
        <div className="space-y-2">
          {!showCustomInput ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomInput(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Custom Specialization
            </Button>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Custom Specialization</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter custom specialization..."
                  value={customSpecialization}
                  onChange={(e) => setCustomSpecialization(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleAddCustomSpecialization}
                  disabled={!customSpecialization.trim()}
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomSpecialization('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-muted-foreground">
        💡 You can select multiple specializations. If you don't find what you need, add custom ones.
      </div>
    </div>
  );
};
