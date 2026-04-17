'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info);
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (typeof this.props.fallback === 'function') {
      return this.props.fallback(error, this.reset);
    }
    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }
    return <DefaultFallback reset={this.reset} />;
  }
}

function DefaultFallback({ reset }: { reset: () => void }) {
  const t = useTranslations('errors.localBoundary');
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md border border-accent-red/40 bg-accent-red/10 p-4"
    >
      <div className="flex items-start gap-2 text-sm text-accent-red">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>{t('fallback')}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={reset}>
        <RefreshCw className="h-4 w-4" />
        {t('reset')}
      </Button>
    </div>
  );
}
