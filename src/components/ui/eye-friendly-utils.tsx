import React from 'react';

// Eye-friendly CSS classes that can be applied to any element
export const eyeFriendlyClasses = {
  // Smooth transitions
  smoothTransition: 'transition-all duration-300 ease-out',
  
  // Hover effects
  hoverLift: 'hover-lift',
  hoverScale: 'hover:scale-105 transition-transform duration-200',
  hoverGlow: 'hover:shadow-lg hover:shadow-primary/20 transition-shadow duration-200',
  
  // Focus states
  focusRing: 'focus-ring',
  focusScale: 'focus:scale-102 transition-transform duration-200',
  
  // Loading states
  loadingPulse: 'loading-pulse',
  
  // Card interactions
  cardInteractive: 'card-interactive',
  
  // Button enhancements
  btnEyeFriendly: 'btn-eye-friendly',
  
  // Form elements
  formEyeFriendly: 'form-eye-friendly',
  
  // Text rendering
  textOptimized: 'antialiased subpixel-antialiased',
  
  // Spacing and layout
  comfortableSpacing: 'space-y-4 leading-relaxed',
  relaxedPadding: 'p-4 md:p-6',
  
  // Colors and contrast
  softBackground: 'bg-gray-50 dark:bg-gray-900',
  softBorder: 'border-gray-200 dark:border-gray-700',
  softShadow: 'shadow-sm hover:shadow-md',
  
  // Accessibility
  highContrast: 'contrast-125',
  reducedMotion: 'motion-reduce',
  
  // Interactive elements
  interactive: 'cursor-pointer select-none',
  disabled: 'opacity-50 cursor-not-allowed',
  
  // Status indicators
  statusSuccess: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  statusWarning: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
  statusError: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  statusInfo: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
};

// Eye-friendly component wrapper
interface EyeFriendlyWrapperProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'card' | 'button' | 'form' | 'interactive';
  disabled?: boolean;
}

export const EyeFriendlyWrapper: React.FC<EyeFriendlyWrapperProps> = ({
  children,
  className = '',
  variant = 'default',
  disabled = false
}) => {
  const baseClasses = eyeFriendlyClasses.smoothTransition;
  
  const variantClasses = {
    default: eyeFriendlyClasses.softBackground,
    card: `${eyeFriendlyClasses.cardInteractive} ${eyeFriendlyClasses.softShadow}`,
    button: eyeFriendlyClasses.btnEyeFriendly,
    form: eyeFriendlyClasses.formEyeFriendly,
    interactive: eyeFriendlyClasses.interactive
  };
  
  const disabledClasses = disabled ? eyeFriendlyClasses.disabled : '';
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}>
      {children}
    </div>
  );
};

// Eye-friendly text component
interface EyeFriendlyTextProps {
  children: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'error';
}

export const EyeFriendlyText: React.FC<EyeFriendlyTextProps> = ({
  children,
  className = '',
  size = 'base',
  weight = 'normal',
  color = 'default'
}) => {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl'
  };
  
  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };
  
  const colorClasses = {
    default: 'text-foreground',
    muted: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400'
  };
  
  return (
    <span className={`
      ${eyeFriendlyClasses.textOptimized}
      ${sizeClasses[size]}
      ${weightClasses[weight]}
      ${colorClasses[color]}
      ${className}
    `}>
      {children}
    </span>
  );
};

// Eye-friendly spacing component
interface EyeFriendlySpacingProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  margin?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const EyeFriendlySpacing: React.FC<EyeFriendlySpacingProps> = ({
  children,
  className = '',
  padding = 'md',
  margin = 'none'
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };
  
  const marginClasses = {
    none: '',
    sm: 'm-2',
    md: 'm-4',
    lg: 'm-6',
    xl: 'm-8'
  };
  
  return (
    <div className={`
      ${paddingClasses[padding]}
      ${marginClasses[margin]}
      ${eyeFriendlyClasses.comfortableSpacing}
      ${className}
    `}>
      {children}
    </div>
  );
};

// Eye-friendly status indicator
interface EyeFriendlyStatusProps {
  status: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const EyeFriendlyStatus: React.FC<EyeFriendlyStatusProps> = ({
  status,
  children,
  className = ''
}) => {
  const statusClasses = {
    success: eyeFriendlyClasses.statusSuccess,
    warning: eyeFriendlyClasses.statusWarning,
    error: eyeFriendlyClasses.statusError,
    info: eyeFriendlyClasses.statusInfo
  };
  
  return (
    <div className={`
      ${statusClasses[status]}
      ${eyeFriendlyClasses.smoothTransition}
      ${eyeFriendlyClasses.hoverLift}
      rounded-lg p-3 border
      ${className}
    `}>
      {children}
    </div>
  );
};

export default EyeFriendlyWrapper;
