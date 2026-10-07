'use client';

import { Component, ReactNode } from 'react';

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
      // Deliberately minimal chrome: the full storefront header/footer used to
      // be mounted here with no-op handlers, which both swallowed every
      // interaction AND re-mounted part of the tree that had just crashed.
      // A crash fallback needs exactly one thing that always works — a link
      // back into the app — plus a retry.
      return this.props.fallback || (
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-line bg-white">
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
              <span className="ms-label text-ink">MERIDIAN SUPPLY CO.</span>
              <a
                className="ms-label underline decoration-line underline-offset-4 hover:decoration-brand transition-colors"
                href="/"
              >
                BACK TO STORE
              </a>
            </div>
          </header>
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
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
