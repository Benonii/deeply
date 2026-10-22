import React from 'react';

export class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode; resetKey?: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(previousProps: { resetKey?: string }) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}
