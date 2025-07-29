import React, { useState } from 'react';
import { 
  Building2,
  Save,
  Upload,
  Palette,
  Phone,
  Mail,
  MapPin,
  Globe
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';

export interface HospitalBranding {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
}

interface HospitalBrandingConfigProps {
  branding: HospitalBranding;
  onBrandingChange: (branding: HospitalBranding) => void;
}

const defaultBranding: HospitalBranding = {
  name: 'NexEagle Hospital',
  tagline: 'Providing Quality Healthcare',
  phone: '+91 98765 43210',
  email: 'info@nexeagle.com',
  website: 'www.nexeagle.com',
  address: '123 Hospital Street, Medical District, City - 123456',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b'
};

export const HospitalBrandingConfig: React.FC<HospitalBrandingConfigProps> = ({
  branding,
  onBrandingChange
}) => {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleSaveBranding = () => {
    onBrandingChange(branding);
    toast({
      title: "Branding Updated",
      description: "Hospital branding has been updated successfully.",
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Logo file must be less than 5MB.",
          variant: "destructive"
        });
        return;
      }
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        onBrandingChange({
          ...branding,
          logo: e.target?.result as string
        });
      };
      reader.readAsDataURL(file);
      
      toast({
        title: "Logo Uploaded",
        description: "Logo has been uploaded successfully.",
      });
    }
  };

  const updateBranding = (field: keyof HospitalBranding, value: string) => {
    onBrandingChange({
      ...branding,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Hospital Branding</h3>
          <p className="text-sm text-muted-foreground">
            Customize your hospital's identity and contact information
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hospitalName">Hospital Name</Label>
                <Input
                  id="hospitalName"
                  value={branding.name}
                  onChange={(e) => updateBranding('name', e.target.value)}
                  placeholder="Enter hospital name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={branding.tagline}
                  onChange={(e) => updateBranding('tagline', e.target.value)}
                  placeholder="Enter hospital tagline"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={branding.address}
                onChange={(e) => updateBranding('address', e.target.value)}
                placeholder="Enter complete hospital address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={branding.phone}
                  onChange={(e) => updateBranding('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={branding.email}
                  onChange={(e) => updateBranding('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="website"
                value={branding.website}
                onChange={(e) => updateBranding('website', e.target.value)}
                placeholder="Enter website URL"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Hospital Logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                {branding.logo ? (
                  <img 
                    src={branding.logo} 
                    alt="Hospital Logo" 
                    className="w-20 h-20 object-contain"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <Label htmlFor="logoUpload" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </div>
                </Label>
                <input
                  id="logoUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Recommended size: 200x200px, Max size: 5MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Scheme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Color Scheme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    value={branding.primaryColor}
                    onChange={(e) => updateBranding('primaryColor', e.target.value)}
                    placeholder="#2563eb"
                  />
                  <div 
                    className="w-12 h-10 rounded border"
                    style={{ backgroundColor: branding.primaryColor }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    value={branding.secondaryColor}
                    onChange={(e) => updateBranding('secondaryColor', e.target.value)}
                    placeholder="#64748b"
                  />
                  <div 
                    className="w-12 h-10 rounded border"
                    style={{ backgroundColor: branding.secondaryColor }}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Preview</h4>
              <div 
                className="p-4 rounded-lg text-white"
                style={{ backgroundColor: branding.primaryColor }}
              >
                <div className="font-semibold">{branding.name}</div>
                <div className="text-sm opacity-90">{branding.tagline}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onBrandingChange(defaultBranding)}>
          Reset to Default
        </Button>
        <Button onClick={handleSaveBranding}>
          <Save className="h-4 w-4 mr-2" />
          Save Branding
        </Button>
      </div>
    </div>
  );
};