import { Component, type ReactNode } from 'react';

/**
 * Catches errors thrown while drawing its children and shows `fallback` instead of closing the app
 * (release builds close on any uncaught drawing error). `retry` draws the children again.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; fallback: (retry: () => void) => ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('Screen failed:', error.message);
  }

  retry = () => this.setState({ failed: false });

  render() {
    return this.state.failed ? this.props.fallback(this.retry) : this.props.children;
  }
}
