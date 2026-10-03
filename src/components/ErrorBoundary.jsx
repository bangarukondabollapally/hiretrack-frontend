import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidMount() {
    window.addEventListener('popstate', this.handlePopState);
  }

  componentWillUnmount() {
    window.removeEventListener('popstate', this.handlePopState);
  }

  handlePopState = () => {
    if (this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  };

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught UI Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', color: '#1A1917' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ fontSize: '13px', color: '#6E6A61', marginBottom: '20px', maxWidth: '480px', margin: '0 auto 20px' }}>
            {this.state.error?.message || 'An unexpected runtime error occurred while loading this view.'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2A5C4B',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
