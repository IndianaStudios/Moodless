import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-shell flex min-h-[100dvh] items-center justify-center p-6 text-center">
        <div className="app-surface max-w-sm rounded-3xl p-7">
          <h1 className="text-lg font-semibold text-white">No se pudo cargar esta pantalla</h1>
          <p className="mt-2 text-sm text-white/60">Tus datos no se han perdido. Vuelve a cargar la aplicación para continuar.</p>
          <button type="button" className="app-button app-button-primary mt-6" onClick={() => window.location.reload()}>
            Recargar
          </button>
        </div>
      </main>
    );
  }
}
