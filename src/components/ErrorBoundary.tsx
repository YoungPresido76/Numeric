import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Last line of defence: shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Numeric crashed', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid h-dvh place-items-center bg-void p-6 text-center text-slate-200">
        <div className="max-w-xs space-y-4">
          <p className="font-display text-2xl italic text-cyan-200">The wavefunction collapsed</p>
          <p className="text-sm text-slate-400">
            Something went wrong. Your last autosave is safe. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 active:bg-cyan-200"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
