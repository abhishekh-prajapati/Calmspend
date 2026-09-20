import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { Button } from './Button';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

/**
 * Root-Level Error Boundary
 * Catches React component render/lifecycle errors.
 * Preserves local data intact and provides controlled reload / recovery options.
 */
export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught component render error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleNavigateDataManagement = () => {
    window.location.href = '/data-management';
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__card">
            <div className="error-boundary__icon-wrapper">
              <AlertTriangle size={28} />
            </div>

            <h1 className="error-boundary__title">Something went wrong</h1>
            <p className="error-boundary__message">
              The application encountered an unexpected error while rendering.
              Your financial records on this device remain safe and intact.
            </p>

            <div className="error-boundary__actions">
              <Button
                variant="primary"
                fullWidth
                onClick={this.handleReload}
                leftIcon={<RefreshCw size={18} />}
              >
                Reload Application
              </Button>

              <Button
                variant="outline"
                fullWidth
                onClick={this.handleNavigateDataManagement}
                leftIcon={<Database size={18} />}
              >
                Go to Data Management
              </Button>
            </div>

            <button
              type="button"
              className="error-boundary__details-toggle"
              onClick={this.toggleDetails}
            >
              {this.state.showDetails ? 'Hide technical details' : 'Show technical details'}
            </button>

            {this.state.showDetails && this.state.error && (
              <div className="error-boundary__details-box">
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
