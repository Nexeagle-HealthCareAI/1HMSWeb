import React from 'react';
import { Settings, Palette, Monitor, Smartphone, Sun, Moon, Zap, Eye, Monitor as MonitorIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useThemeStore } from '@/store/themeStore';

interface ThemeSettingsProps {
  className?: string;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ className = '' }) => {
  const { 
    mode, 
    setMode, 
    colorScheme, 
    setColorScheme, 
    settings, 
    updateSettings,
    getEffectiveMode 
  } = useThemeStore();

  const effectiveMode = getEffectiveMode();

  const colorSchemes = [
    { id: 'blue', name: 'Ocean Blue', description: 'Professional healthcare blue', color: '#3b82f6' },
    { id: 'green', name: 'Emerald Green', description: 'Natural and calming', color: '#10b981' },
    { id: 'purple', name: 'Royal Purple', description: 'Premium and elegant', color: '#8b5cf6' },
    { id: 'orange', name: 'Warm Orange', description: 'Energetic and friendly', color: '#f97316' },
    { id: 'red', name: 'Crimson Red', description: 'Bold and attention-grabbing', color: '#ef4444' },
    { id: 'gray', name: 'Neutral Gray', description: 'Minimal and clean', color: '#6b7280' },
  ];

  const themeModes = [
    { id: 'light', name: 'Light Mode', icon: Sun, description: 'Bright and clear interface' },
    { id: 'dark', name: 'Dark Mode', icon: Moon, description: 'Easy on the eyes in low light' },
    { id: 'auto', name: 'Auto', icon: Monitor, description: 'Follows system preference' },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Theme Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Theme Mode
          </CardTitle>
          <CardDescription>
            Choose your preferred theme mode for the best viewing experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {themeModes.map((themeMode) => {
              const Icon = themeMode.icon;
              const isActive = mode === themeMode.id;
              
              return (
                <Button
                  key={themeMode.id}
                  variant={isActive ? 'default' : 'outline'}
                  className={`
                    h-auto p-4 flex flex-col items-center gap-2 transition-all duration-200
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-lg' 
                      : 'hover:bg-muted hover:shadow-md'
                    }
                  `}
                  onClick={() => setMode(themeMode.id as 'light' | 'dark' | 'auto')}
                >
                  <Icon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">{themeMode.name}</div>
                    <div className="text-xs opacity-80">{themeMode.description}</div>
                  </div>
                  {isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Color Scheme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Scheme
          </CardTitle>
          <CardDescription>
            Select a color scheme that matches your brand or preference
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {colorSchemes.map((scheme) => {
              const isActive = colorScheme === scheme.id;
              
              return (
                <Button
                  key={scheme.id}
                  variant={isActive ? 'default' : 'outline'}
                  className={`
                    h-auto p-4 flex flex-col items-center gap-2 transition-all duration-200
                    ${isActive 
                      ? 'shadow-lg' 
                      : 'hover:bg-muted hover:shadow-md'
                    }
                  `}
                  onClick={() => setColorScheme(scheme.id as any)}
                >
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-current"
                    style={{ backgroundColor: scheme.color }}
                  />
                  <div className="text-center">
                    <div className="font-medium text-sm">{scheme.name}</div>
                    <div className="text-xs opacity-80">{scheme.description}</div>
                  </div>
                  {isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Eye-Friendly Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Eye-Friendly Settings
          </CardTitle>
          <CardDescription>
            Customize settings for better eye comfort and accessibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contrast Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Contrast Level</Label>
            <RadioGroup 
              value={settings.contrast || 'normal'} 
              onValueChange={(value) => updateSettings({ contrast: value as 'low' | 'normal' | 'high' })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="contrast-low" />
                <Label htmlFor="contrast-low" className="text-sm">Low (Softer)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="contrast-normal" />
                <Label htmlFor="contrast-normal" className="text-sm">Normal (Default)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="contrast-high" />
                <Label htmlFor="contrast-high" className="text-sm">High (Enhanced)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Brightness Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Brightness Level</Label>
            <RadioGroup 
              value={settings.brightness || 'normal'} 
              onValueChange={(value) => updateSettings({ brightness: value as 'dim' | 'normal' | 'bright' })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dim" id="brightness-dim" />
                <Label htmlFor="brightness-dim" className="text-sm">Dim (Reduced)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="brightness-normal" />
                <Label htmlFor="brightness-normal" className="text-sm">Normal (Default)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bright" id="brightness-bright" />
                <Label htmlFor="brightness-bright" className="text-sm">Bright (Enhanced)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Color Blindness Support */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Color Blindness Support</Label>
            <Select 
              value={settings.colorBlindness || 'none'} 
              onValueChange={(value) => updateSettings({ colorBlindness: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select color blindness type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Default)</SelectItem>
                <SelectItem value="protanopia">Protanopia (Red-Blind)</SelectItem>
                <SelectItem value="deuteranopia">Deuteranopia (Green-Blind)</SelectItem>
                <SelectItem value="tritanopia">Tritanopia (Blue-Blind)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Current Theme Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Current Theme Preview
          </CardTitle>
          <CardDescription>
            See how your current theme looks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Mode:</span>
                <Badge variant="outline">
                  {themeModes.find(t => t.id === mode)?.name}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Effective Mode:</span>
                <Badge variant="outline">
                  {effectiveMode === 'light' ? 'Light' : 'Dark'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Color Scheme:</span>
                <Badge variant="outline">
                  {colorSchemes.find(c => c.id === colorScheme)?.name}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Border Radius:</span>
                <Badge variant="outline">{settings.borderRadius}px</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Font Size:</span>
                <Badge variant="outline" className="capitalize">{settings.fontSize}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Spacing:</span>
                <Badge variant="outline" className="capitalize">{settings.spacing}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Contrast:</span>
                <Badge variant="outline" className="capitalize">{settings.contrast || 'normal'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Brightness:</span>
                <Badge variant="outline" className="capitalize">{settings.brightness || 'normal'}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThemeSettings;
