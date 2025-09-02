import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/store/themeStore';

interface ThemeToggleProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'ghost', 
  size = 'sm',
  className = '',
  showLabel = false
}) => {
  const { mode, setMode, getEffectiveMode } = useThemeStore();
  const effectiveMode = getEffectiveMode();

  const toggleTheme = () => {
    // Add class to disable all transitions during theme switch
    document.body.classList.add('theme-switching');
    
    // Toggle theme
    setMode(mode === 'light' ? 'dark' : 'light');
    
    // Remove the class after a short delay to re-enable transitions
    setTimeout(() => {
      document.body.classList.remove('theme-switching');
    }, 50);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`
        relative overflow-hidden
        group ${className}
      `}
      title={`Switch to ${effectiveMode === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${effectiveMode === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative flex items-center gap-2">
        {effectiveMode === 'light' ? (
          <>
            <Moon className="h-4 w-4" />
            {showLabel && (
              <span className="text-sm font-medium">
                Dark Mode
              </span>
            )}
          </>
        ) : (
          <>
            <Sun className="h-4 w-4" />
            {showLabel && (
              <span className="text-sm font-medium">
                Light Mode
              </span>
            )}
          </>
        )}
      </div>
      

    </Button>
  );
};

export default ThemeToggle;
