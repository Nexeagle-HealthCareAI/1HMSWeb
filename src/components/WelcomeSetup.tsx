import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  UserCheck, 
  Upload, 
  CheckCircle2, 
  ArrowRight, 
  MapPin,
  Phone,
  Mail,
  FileText,
  Camera,
  PenTool,
  AlertTriangle,
  Star
} from 'lucide-react';

interface WelcomeSetupProps {
  onComplete: (data: SetupData) => void;
  onSkip: () => void;
}

interface SetupData {
  hospital: {
    name: string;
    phone: string;
    email: string;
    registrationNumber: string;
    address: string;
  };
  doctor: {
    fullName: string;
    email: string;
    specialization: string;
    licenseNumber: string;
    qualification: string;
    experience: string;
  };
  documents: {
    license: File | null;
    clinicPhotos: File[];
    signature: File | null;
  };
}

const WelcomeSetup: React.FC<WelcomeSetupProps> = ({ onComplete, onSkip }) => {
  const [showSetup, setShowSetup] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState<SetupData>({
    hospital: {
      name: '',
      phone: '',
      email: '',
      registrationNumber: '',
      address: '',
    },
    doctor: {
      fullName: '',
      email: '',
      specialization: '',
      licenseNumber: '',
      qualification: '',
      experience: '',
    },
    documents: {
      license: null,
      clinicPhotos: [],
      signature: null,
    }
  });
  
  const { toast } = useToast();

  // Auto-save functionality
  useEffect(() => {
    const saveData = () => {
      localStorage.setItem('easyHMS_setupData', JSON.stringify(setupData));
    };
    
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [setupData]);

  // Load saved data
  useEffect(() => {
    const savedData = localStorage.getItem('easyHMS_setupData');
    if (savedData) {
      setSetupData(JSON.parse(savedData));
    }
  }, []);

  const calculateProgress = (): number => {
    const requiredFields = [
      setupData.hospital.name,
      setupData.hospital.phone,
      setupData.hospital.registrationNumber,
      setupData.hospital.address,
      setupData.doctor.fullName,
      setupData.doctor.specialization,
      setupData.doctor.licenseNumber,
      setupData.doctor.qualification,
    ];
    
    const optionalFields = [
      setupData.hospital.email,
      setupData.doctor.email,
      setupData.doctor.experience,
      setupData.documents.license,
      setupData.documents.signature,
      setupData.documents.clinicPhotos.length > 0,
    ];
    
    const requiredComplete = requiredFields.filter(field => field && field.toString().trim() !== '').length;
    const optionalComplete = optionalFields.filter(field => field).length;
    
    const requiredWeight = 70; // 70% for required fields
    const optionalWeight = 30; // 30% for optional fields
    
    const requiredProgress = (requiredComplete / requiredFields.length) * requiredWeight;
    const optionalProgress = (optionalComplete / optionalFields.length) * optionalWeight;
    
    return Math.round(requiredProgress + optionalProgress);
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(setupData.hospital.name && setupData.hospital.phone && 
                 setupData.hospital.registrationNumber && setupData.hospital.address);
      case 2:
        return !!(setupData.doctor.fullName && setupData.doctor.specialization && 
                 setupData.doctor.licenseNumber && setupData.doctor.qualification);
      case 3:
        return true; // Optional step
      case 4:
        return true; // Confirmation step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      if (isStepValid(currentStep)) {
        setCurrentStep(currentStep + 1);
        toast({
          title: "Progress Saved",
          description: "Your information has been saved automatically.",
        });
      } else {
        toast({
          title: "Required Fields Missing",
          description: "Please fill in all required fields before proceeding.",
          variant: "destructive",
        });
      }
    }
  };

  const handleComplete = () => {
    const progress = calculateProgress();
    if (progress >= 70) {
      onComplete(setupData);
      localStorage.removeItem('easyHMS_setupData');
      toast({
        title: "Setup Complete!",
        description: "Welcome to EasyHMS. Your dashboard is now ready.",
      });
    } else {
      toast({
        title: "Incomplete Profile",
        description: "Complete at least 70% to unlock all features.",
        variant: "destructive",
      });
    }
  };

  const handleSkipSetup = () => {
    onSkip();
    toast({
      title: "Setup Skipped",
      description: "You can complete your profile anytime from settings.",
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Hospital Details</h3>
                <p className="text-sm text-muted-foreground">Basic information about your hospital</p>
              </div>
            </div>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="hospitalName">Hospital Name *</Label>
                <Input
                  id="hospitalName"
                  value={setupData.hospital.name}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    hospital: { ...prev.hospital, name: e.target.value }
                  }))}
                  placeholder="Enter hospital name"
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hospitalPhone">Contact Number *</Label>
                  <Input
                    id="hospitalPhone"
                    value={setupData.hospital.phone}
                    onChange={(e) => setSetupData(prev => ({
                      ...prev,
                      hospital: { ...prev.hospital, phone: e.target.value }
                    }))}
                    placeholder="+1 (555) 123-4567"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="hospitalEmail">Hospital Email</Label>
                  <Input
                    id="hospitalEmail"
                    type="email"
                    value={setupData.hospital.email}
                    onChange={(e) => setSetupData(prev => ({
                      ...prev,
                      hospital: { ...prev.hospital, email: e.target.value }
                    }))}
                    placeholder="info@hospital.com"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="registrationNumber">Hospital Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  value={setupData.hospital.registrationNumber}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    hospital: { ...prev.hospital, registrationNumber: e.target.value }
                  }))}
                  placeholder="REG123456789"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="address">Hospital Address *</Label>
                <Textarea
                  id="address"
                  value={setupData.hospital.address}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    hospital: { ...prev.hospital, address: e.target.value }
                  }))}
                  placeholder="Enter complete hospital address"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Doctor Profile</h3>
                <p className="text-sm text-muted-foreground">Your professional information</p>
              </div>
            </div>
            
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="doctorName">Full Name *</Label>
                  <Input
                    id="doctorName"
                    value={setupData.doctor.fullName}
                    onChange={(e) => setSetupData(prev => ({
                      ...prev,
                      doctor: { ...prev.doctor, fullName: e.target.value }
                    }))}
                    placeholder="Dr. John Smith"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="doctorEmail">Email</Label>
                  <Input
                    id="doctorEmail"
                    type="email"
                    value={setupData.doctor.email}
                    onChange={(e) => setSetupData(prev => ({
                      ...prev,
                      doctor: { ...prev.doctor, email: e.target.value }
                    }))}
                    placeholder="doctor@hospital.com"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="specialization">Specialization *</Label>
                <Select onValueChange={(value) => setSetupData(prev => ({
                  ...prev,
                  doctor: { ...prev.doctor, specialization: value }
                }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cardiology">Cardiology</SelectItem>
                    <SelectItem value="neurology">Neurology</SelectItem>
                    <SelectItem value="orthopedics">Orthopedics</SelectItem>
                    <SelectItem value="pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="general">General Medicine</SelectItem>
                    <SelectItem value="surgery">Surgery</SelectItem>
                    <SelectItem value="dermatology">Dermatology</SelectItem>
                    <SelectItem value="psychiatry">Psychiatry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="licenseNumber">Medical License Number *</Label>
                  <Input
                    id="licenseNumber"
                    value={setupData.doctor.licenseNumber}
                    onChange={(e) => setSetupData(prev => ({
                      ...prev,
                      doctor: { ...prev.doctor, licenseNumber: e.target.value }
                    }))}
                    placeholder="LIC123456789"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="experience">Experience (Years)</Label>
                  <Input
                    id="experience"
                    value={setupData.doctor.experience}
                    onChange={(e) => setSetupData(prev => ({
                      ...prev,
                      doctor: { ...prev.doctor, experience: e.target.value }
                    }))}
                    placeholder="5"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="qualification">Qualification *</Label>
                <Input
                  id="qualification"
                  value={setupData.doctor.qualification}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    doctor: { ...prev.doctor, qualification: e.target.value }
                  }))}
                  placeholder="MBBS, MD"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Upload Documents</h3>
                <p className="text-sm text-muted-foreground">Optional documents (you can skip this step)</p>
              </div>
            </div>
            
            <div className="grid gap-6">
              <div className="p-4 border border-dashed border-border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <Label>Medical License Photo</Label>
                </div>
                <Input type="file" accept="image/*" className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Upload a clear photo of your medical license</p>
              </div>
              
              <div className="p-4 border border-dashed border-border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <Label>Clinic Photos</Label>
                </div>
                <Input type="file" accept="image/*" multiple className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Upload photos of your clinic/hospital</p>
              </div>
              
              <div className="p-4 border border-dashed border-border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <PenTool className="h-5 w-5 text-muted-foreground" />
                  <Label>Digital Signature</Label>
                </div>
                <Input type="file" accept="image/*" className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Upload your signature for prescriptions</p>
              </div>
            </div>
          </div>
        );
        
      case 4:
        const progress = calculateProgress();
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Setup Complete!</h3>
                <p className="text-sm text-muted-foreground">Review your profile completion</p>
              </div>
            </div>
            
            <div className="p-6 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-medium">Profile Completion</span>
                <Badge variant={progress >= 70 ? "default" : "secondary"} className="text-lg px-3 py-1">
                  {progress}%
                </Badge>
              </div>
              <Progress value={progress} className="h-3 mb-4" />
              
              {progress >= 70 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Great! Your profile is ready for full access.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Some features will remain locked until completion.</span>
                </div>
              )}
            </div>
            
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 bg-background border rounded-lg">
                <span>Hospital Information</span>
                <Badge variant={isStepValid(1) ? "default" : "secondary"}>
                  {isStepValid(1) ? "Complete" : "Incomplete"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-background border rounded-lg">
                <span>Doctor Profile</span>
                <Badge variant={isStepValid(2) ? "default" : "secondary"}>
                  {isStepValid(2) ? "Complete" : "Incomplete"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-background border rounded-lg">
                <span>Documents</span>
                <Badge variant="secondary">Optional</Badge>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  if (!showSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
              <Star className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">🎉 You're almost ready to use EasyHMS!</CardTitle>
            <CardDescription className="text-base leading-relaxed mt-3">
              To unlock your full dashboard and start managing your hospital, let's quickly finish setting up your account.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setShowSetup(true)} 
              className="w-full h-12 text-lg"
              size="lg"
            >
              Start Setup
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleSkipSetup}
              className="w-full"
            >
              Skip for now (limited features)
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Dialog open={showSetup} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            EasyHMS Setup - Step {currentStep} of 4
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step <= currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
            <Badge variant="outline">{calculateProgress()}% Complete</Badge>
          </div>
          
          <Progress value={(currentStep / 4) * 100} className="h-2" />
          
          <Separator />
          
          {renderStepContent()}
          
          <Separator />
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : handleSkipSetup()}
            >
              {currentStep > 1 ? 'Previous' : 'Skip Setup'}
            </Button>
            
            <div className="flex gap-2">
              {currentStep === 3 && (
                <Button variant="ghost" onClick={() => setCurrentStep(4)}>
                  Skip Documents
                </Button>
              )}
              
              {currentStep < 4 ? (
                <Button onClick={handleNext} disabled={!isStepValid(currentStep)}>
                  Next: {currentStep === 1 ? 'Doctor Profile' : currentStep === 2 ? 'Upload Docs' : 'Final Step'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onComplete(setupData)}>
                    Complete Later
                  </Button>
                  <Button onClick={handleComplete}>
                    Go to Dashboard
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeSetup;