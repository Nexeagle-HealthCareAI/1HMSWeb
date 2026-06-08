import React from 'react';
import { Settings, Palette, Monitor, Smartphone, Sun, Moon, Zap, Eye, Monitor as MonitorIcon, Plus, Minus, Sliders, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
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
          {/* Font Size Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Font Size</Label>
              <Badge variant="outline" className="text-xs">
                {settings.fontSize}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const current = settings.fontSize;
                  const sizes = ['small', 'medium', 'large'];
                  const currentIndex = sizes.indexOf(current);
                  const newIndex = Math.max(0, currentIndex - 1);
                  updateSettings({ fontSize: sizes[newIndex] as 'small' | 'medium' | 'large' });
                }}
                disabled={settings.fontSize === 'small'}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>
              
              <div className="flex-1">
                <Slider
                  value={[
                    settings.fontSize === 'small' ? 0 : 
                    settings.fontSize === 'medium' ? 50 : 100
                  ]}
                  onValueChange={(value) => {
                    const size = value[0] <= 25 ? 'small' : value[0] <= 75 ? 'medium' : 'large';
                    updateSettings({ fontSize: size as 'small' | 'medium' | 'large' });
                  }}
                  max={100}
                  step={50}
                  className="w-full"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const current = settings.fontSize;
                  const sizes = ['small', 'medium', 'large'];
                  const currentIndex = sizes.indexOf(current);
                  const newIndex = Math.min(2, currentIndex + 1);
                  updateSettings({ fontSize: sizes[newIndex] as 'small' | 'medium' | 'large' });
                }}
                disabled={settings.fontSize === 'large'}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
              </div>
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>Small</span>
              <span>Medium</span>
              <span>Large</span>
              </div>
              </div>

          {/* Contrast Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Contrast Level</Label>
              <Badge variant="outline" className="text-xs">
                {settings.contrast || 'normal'}
              </Badge>
          </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const current = settings.contrast || 'normal';
                  const levels = ['low', 'normal', 'high'];
                  const currentIndex = levels.indexOf(current);
                  const newIndex = Math.max(0, currentIndex - 1);
                  updateSettings({ contrast: levels[newIndex] as 'low' | 'normal' | 'high' });
                }}
                disabled={(settings.contrast || 'normal') === 'low'}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>
              
              <div className="flex-1">
                <Slider
                  value={[
                    (settings.contrast || 'normal') === 'low' ? 0 : 
                    (settings.contrast || 'normal') === 'normal' ? 50 : 100
                  ]}
                  onValueChange={(value) => {
                    const level = value[0] <= 25 ? 'low' : value[0] <= 75 ? 'normal' : 'high';
                    updateSettings({ contrast: level as 'low' | 'normal' | 'high' });
                  }}
                  max={100}
                  step={50}
                  className="w-full"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const current = settings.contrast || 'normal';
                  const levels = ['low', 'normal', 'high'];
                  const currentIndex = levels.indexOf(current);
                  const newIndex = Math.min(2, currentIndex + 1);
                  updateSettings({ contrast: levels[newIndex] as 'low' | 'normal' | 'high' });
                }}
                disabled={(settings.contrast || 'normal') === 'high'}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
              </div>
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low</span>
              <span>Normal</span>
              <span>High</span>
              </div>
          </div>

          {/* Color Blindness Support */}
          <div className="space-y-4">
            <div className="space-y-0.5">
            <Label className="text-sm font-medium">Color Blindness Support</Label>
              <p className="text-xs text-gray-500">Enhance visibility for different types of color vision</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div 
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  (settings.colorBlindness || 'none') === 'none' 
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => updateSettings({ colorBlindness: 'none' })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">N</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">None (Default)</div>
                    <div className="text-xs text-gray-500">Standard color vision</div>
                  </div>
                  {(settings.colorBlindness || 'none') === 'none' && (
                    <CheckCircle className="h-4 w-4 text-brand-600" />
                  )}
                </div>
              </div>

              <div 
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  (settings.colorBlindness || 'none') === 'protanopia' 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => updateSettings({ colorBlindness: 'protanopia' })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">P</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Protanopia</div>
                    <div className="text-xs text-gray-500">Red-Blind (Red-Green)</div>
                  </div>
                  {(settings.colorBlindness || 'none') === 'protanopia' && (
                    <CheckCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>

              <div 
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  (settings.colorBlindness || 'none') === 'deuteranopia' 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => updateSettings({ colorBlindness: 'deuteranopia' })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">D</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Deuteranopia</div>
                    <div className="text-xs text-gray-500">Green-Blind (Red-Green)</div>
                  </div>
                  {(settings.colorBlindness || 'none') === 'deuteranopia' && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>

              <div 
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  (settings.colorBlindness || 'none') === 'tritanopia' 
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => updateSettings({ colorBlindness: 'tritanopia' })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">T</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Tritanopia</div>
                    <div className="text-xs text-gray-500">Blue-Blind (Blue-Yellow)</div>
                  </div>
                  {(settings.colorBlindness || 'none') === 'tritanopia' && (
                    <CheckCircle className="h-4 w-4 text-brand-600" />
                  )}
                </div>
              </div>
            </div>

            {/* Color Vision Preview */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Color Vision Preview</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="w-6 h-6 rounded bg-red-500 mx-auto mb-1"></div>
                  <span className="text-xs text-gray-500">Red</span>
                </div>
                <div className="text-center">
                  <div className="w-6 h-6 rounded bg-green-500 mx-auto mb-1"></div>
                  <span className="text-xs text-gray-500">Green</span>
                </div>
                <div className="text-center">
                  <div className="w-6 h-6 rounded bg-brand-500 mx-auto mb-1"></div>
                  <span className="text-xs text-gray-500">Blue</span>
                </div>
                <div className="text-center">
                  <div className="w-6 h-6 rounded bg-yellow-500 mx-auto mb-1"></div>
                  <span className="text-xs text-gray-500">Yellow</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {settings.colorBlindness === 'none' && "Standard color vision - all colors appear normal"}
                {settings.colorBlindness === 'protanopia' && "Red-blind vision - reds appear darker and greens may be confused"}
                {settings.colorBlindness === 'deuteranopia' && "Green-blind vision - greens appear lighter and reds may be confused"}
                {settings.colorBlindness === 'tritanopia' && "Blue-blind vision - blues appear darker and yellows may be confused"}
              </p>
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Reduced Motion</Label>
              <p className="text-xs text-gray-500">Disable animations for better accessibility</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
              className="h-8 px-3"
            >
              {settings.reducedMotion ? 'Enabled' : 'Disabled'}
            </Button>
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
