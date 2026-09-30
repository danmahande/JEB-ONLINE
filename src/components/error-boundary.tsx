'use client';

import { Component, ReactNode } from 'react';
import Header from '@/components/storefront/header';
import Footer from '@/components/storefront/footer';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex flex-col">
          <Header
            regions={[]}
            onNavigate={() => {}}
            onOpenCart={() => {}}
            query=""
            onQuery={() => {}}
            onSearchSubmit={() => {}}
          />
          <main className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-center">
              <h2 className="ms-display text-2xl mb-6">Something went wrong</h2>
              <p className="mb-6 text-hush">
                Please try again or contact us if the issue persists.
              </p>
              <button 
                onClick={() => this.setState({ hasError: false })}
                className="ms-key ms-label px-6 py-3"
              >
                Try Again
              </button>
            </div>
          </main>
          <Footer
            onNavigate={(v, q) => {
              // Simple navigation handling for error state
            }}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
