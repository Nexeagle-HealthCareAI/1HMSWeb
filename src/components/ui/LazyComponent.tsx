import React, { Suspense, lazy, Component, ReactNode } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LazyComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface LazyComponentState {
  hasError: boolean;
  error?: Error;
}

// Error Boundary for lazy components
class ErrorBoundary extends Component<LazyComponentProps, LazyComponentState> {
  constructor(props: LazyComponentProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LazyComponentState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.errorFallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Default loading fallback
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <p className="text-sm text-muted-foreground">Loading component...</p>
    </div>
  </div>
);

// Lazy Component wrapper
export const LazyComponent: React.FC<LazyComponentProps> = ({
  children,
  fallback = <DefaultLoadingFallback />,
  errorFallback,
  onError
}) => {
  return (
    <ErrorBoundary errorFallback={errorFallback} onError={onError}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// Utility function to create lazy components with consistent loading states
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    fallback?: ReactNode;
    errorFallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }
) {
  const LazyComponent = lazy(importFn);
  
  return React.forwardRef<React.ComponentRef<T>, React.ComponentProps<T>>((props, ref) => (
    <LazyComponent
      {...options}
      fallback={options?.fallback || <DefaultLoadingFallback />}
    >
      <LazyComponent ref={ref} {...props} />
    </LazyComponent>
  ));
}

// Preload utility for lazy components
export function preloadLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return () => {
    importFn();
  };
}
