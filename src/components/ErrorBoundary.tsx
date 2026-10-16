import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SHIFT 1.0 ErrorBoundary caught]:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('shift1_user_registration');
      sessionStorage.clear();
    } catch {}
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B132B] text-white flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-2xl bg-[#1E293B] border border-slate-700 shadow-md space-y-5">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 border border-slate-700 text-sky-400 flex items-center justify-center font-bold text-xl">
              !
            </div>
            <h2 className="text-2xl font-bold font-serif text-white">
              Something went wrong
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              An unexpected display error occurred. You can safely reset the app without losing your seat.
            </p>
            {this.state.error && (
              <pre className="p-3 rounded-lg bg-[#0B132B] border border-slate-800 text-[11px] font-sans text-slate-300 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
            >
              Recover &amp; Continue
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
