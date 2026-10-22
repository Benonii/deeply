import React from 'react';

/** Keeps a failing Convex query (e.g. a function not deployed yet) from taking down the page. */
export class ErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(previousProps: { resetKey?: string }) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() { return this.state.error ? this.props.fallback : this.props.children; }
}
