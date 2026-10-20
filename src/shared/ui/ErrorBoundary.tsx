import { Component, type ErrorInfo, type ReactNode } from 'react';
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('APSELITH render failure', error, info.componentStack);
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>APSELITH could not render this view</h1>
        <p role="alert">{this.state.error}</p>
        <button onClick={() => window.location.reload()}>
          Reload application
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
