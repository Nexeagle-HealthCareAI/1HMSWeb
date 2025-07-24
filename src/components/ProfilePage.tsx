import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Building2, 
  Stethoscope, 
  Award, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Star,
  Trophy,
  Target,
  Zap,
  ArrowLeft,
  Save,
  Upload,
  Camera,
  Shield,
  Users,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProfilePageProps {
  onBack: () => void;
  userType?: 'admin-doctor' | 'admin' | 'doctor' | 'staff';
}

interface ProfileData {
  personal: {
    fullName: string;
    email: string;
    phone: string;
    profilePicture?: string;
    dateOfBirth?: string;
    address?: string;
  };
  professional: {
    employeeId: string;
    department: string;
    role: string;
    joiningDate: string;
    qualification?: string;
    specialization?: string;
    licenseNumber?: string;
    experience?: string;
  };
  achievements: {
    totalPatients: number;
    satisfactionRating: number;
    yearsOfService: number;
    certificationsCount: number;
  };
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ 
  onBack, 
  userType = 'doctor' 
}) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    personal: {
      fullName: '',
      email: '',
      phone: '',
      profilePicture: '',
      dateOfBirth: '',
      address: ''
    },
    professional: {
      employeeId: '',
      department: '',
      role: '',
      joiningDate: '',
      qualification: '',
      specialization: '',
      licenseNumber: '',
      experience: ''
    },
    achievements: {
      totalPatients: 0,
      satisfactionRating: 0,
      yearsOfService: 0,
      certificationsCount: 0
    }
  });

  // Load existing data on component mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = () => {
    const setupData = localStorage.getItem('easyHMS_setupData');
    const userRole = localStorage.getItem('easyHMS_userRole') || userType;
    
    if (setupData) {
      const data = JSON.parse(setupData);
      
      // Map setup data to profile structure
      setProfileData({
        personal: {
          fullName: data.doctor?.fullName || '',
          email: data.doctor?.email || '',
          phone: data.doctor?.phone || '',
          profilePicture: data.documents?.profilePicture || '',
          dateOfBirth: data.doctor?.dateOfBirth || '',
          address: data.doctor?.address || data.hospital?.address || ''
        },
        professional: {
          employeeId: data.doctor?.employeeId || 'EMP001',
          department: data.doctor?.department || data.doctor?.specialization || '',
          role: userRole,
          joiningDate: data.doctor?.joiningDate || new Date().toISOString().split('T')[0],
          qualification: data.doctor?.qualification || '',
          specialization: data.doctor?.specialization || '',
          licenseNumber: data.doctor?.licenseNumber || '',
          experience: data.doctor?.experience || ''
        },
        achievements: {
          totalPatients: Math.floor(Math.random() * 500) + 100,
          satisfactionRating: 4.5 + Math.random() * 0.5,
          yearsOfService: parseInt(data.doctor?.experience?.split(' ')[0] || '1'),
          certificationsCount: Math.floor(Math.random() * 10) + 3
        }
      });
    }
  };

  const calculateCompletionPercentage = () => {
    const allFields = [
      profileData.personal.fullName,
      profileData.personal.email,
      profileData.personal.phone,
      profileData.professional.department,
      profileData.professional.qualification,
      profileData.professional.specialization,
      profileData.professional.licenseNumber,
      profileData.personal.address,
      profileData.personal.profilePicture,
      profileData.professional.experience
    ];
    
    const filledFields = allFields.filter(field => field && field.toString().trim() !== '').length;
    return Math.round((filledFields / allFields.length) * 100);
  };

  const handleSave = () => {
    // Update localStorage with new profile data
    const setupData = localStorage.getItem('easyHMS_setupData');
    if (setupData) {
      const data = JSON.parse(setupData);
      data.doctor = {
        ...data.doctor,
        ...profileData.personal,
        ...profileData.professional
      };
      localStorage.setItem('easyHMS_setupData', JSON.stringify(data));
    }
    
    setIsEditing(false);
    toast({
      title: "Profile Updated! 🎉",
      description: "Your profile has been successfully updated.",
    });
  };

  const handleInputChange = (section: keyof ProfileData, field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const completionPercentage = calculateCompletionPercentage();

  // Gamification elements
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressMessage = (percentage: number) => {
    if (percentage >= 90) return "🎉 Profile Master! You're all set!";
    if (percentage >= 70) return "🌟 Almost there! Just a few more details.";
    if (percentage >= 50) return "⚡ Good progress! Keep going!";
    return "🚀 Let's complete your profile journey!";
  };

  const getBadgeForCompletion = (percentage: number) => {
    if (percentage >= 90) return { icon: Trophy, text: "Profile Master", color: "bg-yellow-100 text-yellow-800" };
    if (percentage >= 70) return { icon: Star, text: "Profile Expert", color: "bg-blue-100 text-blue-800" };
    if (percentage >= 50) return { icon: Target, text: "Profile Builder", color: "bg-green-100 text-green-800" };
    return { icon: Zap, text: "Profile Starter", color: "bg-purple-100 text-purple-800" };
  };

  const badge = getBadgeForCompletion(completionPercentage);

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">My Profile</h1>
              <p className="text-muted-foreground">Manage your personal and professional information</p>
            </div>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
      </div>

      {/* Profile Completion Card */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <badge.icon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">Profile Completion</h3>
                  <Badge className={badge.color}>
                    <badge.icon className="h-3 w-3 mr-1" />
                    {badge.text}
                  </Badge>
                </div>
                <p className={`text-sm ${getProgressColor(completionPercentage)} font-medium`}>
                  {getProgressMessage(completionPercentage)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary mb-1">{completionPercentage}%</div>
              <Progress value={completionPercentage} className="w-32 h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Summary Card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6 text-center">
            <div className="relative mb-4">
              <Avatar className="h-24 w-24 mx-auto">
                <AvatarImage src={profileData.personal.profilePicture} />
                <AvatarFallback className="text-lg">
                  {profileData.personal.fullName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <Button
                  size="sm"
                  className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-2 rounded-full p-2"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <h2 className="text-xl font-bold text-foreground mb-1">
              {profileData.personal.fullName || 'Your Name'}
            </h2>
            <p className="text-muted-foreground mb-4 capitalize">
              {profileData.professional.role.replace('-', ' ')} • {profileData.professional.department}
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{profileData.achievements.totalPatients}</div>
                <div className="text-xs text-muted-foreground">Patients</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{profileData.achievements.satisfactionRating.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Rating</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{profileData.achievements.yearsOfService}</div>
                <div className="text-xs text-muted-foreground">Years</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{profileData.achievements.certificationsCount}</div>
                <div className="text-xs text-muted-foreground">Certs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Info
                </TabsTrigger>
                <TabsTrigger value="professional" className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Professional
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={profileData.personal.fullName}
                      onChange={(e) => handleInputChange('personal', 'fullName', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.personal.email}
                      onChange={(e) => handleInputChange('personal', 'email', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={profileData.personal.phone}
                      onChange={(e) => handleInputChange('personal', 'phone', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={profileData.personal.dateOfBirth}
                      onChange={(e) => handleInputChange('personal', 'dateOfBirth', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={profileData.personal.address}
                    onChange={(e) => handleInputChange('personal', 'address', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="professional" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      value={profileData.professional.employeeId}
                      disabled
                      className="mt-1 bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={profileData.professional.role.replace('-', ' ').toUpperCase()}
                      disabled
                      className="mt-1 bg-muted capitalize"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department/Specialization *</Label>
                    <Input
                      id="department"
                      value={profileData.professional.department}
                      onChange={(e) => handleInputChange('professional', 'department', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="qualification">Qualification *</Label>
                    <Input
                      id="qualification"
                      value={profileData.professional.qualification}
                      onChange={(e) => handleInputChange('professional', 'qualification', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  {(userType === 'doctor' || userType === 'admin-doctor') && (
                    <>
                      <div>
                        <Label htmlFor="licenseNumber">Medical License Number *</Label>
                        <Input
                          id="licenseNumber"
                          value={profileData.professional.licenseNumber}
                          onChange={(e) => handleInputChange('professional', 'licenseNumber', e.target.value)}
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="specialization">Specialization</Label>
                        <Input
                          id="specialization"
                          value={profileData.professional.specialization}
                          onChange={(e) => handleInputChange('professional', 'specialization', e.target.value)}
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input
                      id="experience"
                      value={profileData.professional.experience}
                      onChange={(e) => handleInputChange('professional', 'experience', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="joiningDate">Joining Date</Label>
                    <Input
                      id="joiningDate"
                      type="date"
                      value={profileData.professional.joiningDate}
                      onChange={(e) => handleInputChange('professional', 'joiningDate', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {isEditing && (
              <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">{profileData.achievements.totalPatients}</div>
            <div className="text-sm text-blue-600">Total Patients Served</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200">
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">{profileData.achievements.satisfactionRating.toFixed(1)}/5.0</div>
            <div className="text-sm text-green-600">Patient Satisfaction</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200">
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-700">{profileData.achievements.yearsOfService}</div>
            <div className="text-sm text-purple-600">Years of Service</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 border-yellow-200">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-700">{profileData.achievements.certificationsCount}</div>
            <div className="text-sm text-yellow-600">Certifications</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};