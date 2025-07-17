import React, { useState } from 'react';
import { Check, X, Upload, Building, Mail, Camera, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface ProfileCompletionProps {
  onClose: () => void;
}

interface ProfileField {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
  required: boolean;
  enforcement?: string;
  benefit?: string;
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({ onClose }) => {
  const [showModal, setShowModal] = useState(false);
  const [profileFields, setProfileFields] = useState<ProfileField[]>([
    {
      id: 'mobile',
      label: 'Mobile Verified',
      description: 'Phone number verification',
      icon: Check,
      completed: true,
      required: true
    },
    {
      id: 'license',
      label: 'Medical License',
      description: 'Upload medical license document',
      icon: Upload,
      completed: false,
      required: true,
      enforcement: 'Required before prescriptions',
      benefit: 'Unlock prescription feature'
    },
    {
      id: 'hospital',
      label: 'Hospital Details',
      description: 'Add hospital/clinic information',
      icon: Building,
      completed: false,
      required: true,
      enforcement: 'Required for patient visibility',
      benefit: 'Appear in patient searches'
    },
    {
      id: 'email',
      label: 'Email Address',
      description: 'Add email for important updates',
      icon: Mail,
      completed: false,
      required: false,
      benefit: 'Get appointment notifications'
    },
    {
      id: 'photo',
      label: 'Profile Photo',
      description: 'Add professional photo',
      icon: Camera,
      completed: false,
      required: false,
      benefit: 'Patients trust verified profiles'
    }
  ]);

  const completedCount = profileFields.filter(field => field.completed).length;
  const totalFields = profileFields.length;
  const progressPercentage = Math.round((completedCount / totalFields) * 100);

  const handleCompleteField = (fieldId: string) => {
    setProfileFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, completed: true } : field
    ));
    
    toast({
      title: "Profile Updated!",
      description: "Field marked as completed"
    });
  };

  const remindLater = () => {
    toast({
      title: "Reminder Set",
      description: "We'll remind you after 3 more logins"
    });
    onClose();
  };

  return (
    <>
      <Card className="bg-gradient-primary text-white shadow-elegant mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Complete Your Profile</h3>
                <p className="text-white/90 text-sm">
                  Top doctors average 95% completion
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Progress: {progressPercentage}%</span>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {completedCount}/{totalFields} Complete
              </Badge>
            </div>
            
            <Progress value={progressPercentage} className="h-2 bg-white/20" />
            
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={() => setShowModal(true)}
                className="bg-white text-healthcare-primary hover:bg-white/90 font-semibold"
              >
                Add Details Now (2 mins)
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                onClick={remindLater}
                className="text-white border-white/30 hover:bg-white/20"
              >
                Remind Me Later
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completion Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-healthcare-primary">
              Complete Your Profile
            </DialogTitle>
            <DialogDescription>
              Complete your profile to unlock all features and increase patient trust
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Current Progress</span>
              <div className="flex items-center gap-2">
                <Progress value={progressPercentage} className="w-20 h-2" />
                <span className="text-sm font-semibold">{progressPercentage}%</span>
              </div>
            </div>

            <div className="space-y-3">
              {profileFields.map((field) => (
                <div key={field.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      field.completed 
                        ? 'bg-healthcare-success/20 text-healthcare-success' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <field.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.label}</span>
                        {field.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                        {field.completed && (
                          <Badge variant="default" className="text-xs bg-healthcare-success">
                            Completed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{field.description}</p>
                      {field.enforcement && (
                        <p className="text-xs text-healthcare-warning mt-1">
                          ⚠️ {field.enforcement}
                        </p>
                      )}
                      {field.benefit && (
                        <p className="text-xs text-healthcare-success mt-1">
                          ✨ {field.benefit}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {!field.completed && (
                    <Button 
                      size="sm"
                      onClick={() => handleCompleteField(field.id)}
                      className="bg-healthcare-primary hover:bg-healthcare-primary/90"
                    >
                      {field.id === 'license' ? 'Upload' : 
                       field.id === 'hospital' ? 'Add Details' :
                       field.id === 'email' ? 'Add Email' :
                       field.id === 'photo' ? 'Upload Photo' : 'Complete'}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {progressPercentage >= 90 && (
              <div className="p-4 bg-gradient-primary/10 rounded-lg border border-healthcare-primary/20">
                <div className="flex items-center gap-2 text-healthcare-primary mb-2">
                  <Star className="h-5 w-5" />
                  <span className="font-semibold">Congratulations!</span>
                </div>
                <p className="text-sm">
                  You're in the top 10% of profile completeness! Patients are more likely to trust complete profiles.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => setShowModal(false)}
                className="flex-1 bg-healthcare-primary"
              >
                Save Progress
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowModal(false);
                  remindLater();
                }}
              >
                Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};