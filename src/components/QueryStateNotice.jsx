import React from 'react';
import './QueryStateNotice.css';

export default function QueryStateNotice({ isFetching, isLoading, isError, refetch }) {
  const showProgressBar = isFetching && !isLoading;
  const showErrorBanner = isError && !isLoading;

  if (!showProgressBar && !showErrorBanner) return null;

  return (
    <div className="query-state-notice-wrapper">
      {showProgressBar && (
        <div className="query-progress-bar" title="Updating background data...">
          <div className="query-progress-bar-fill" />
        </div>
      )}
      {showErrorBanner && (
        <div className="query-error-banner">
          <span>Unable to refresh latest data. Showing cached copy.</span>
          {refetch && (
            <button type="button" className="query-retry-btn" onClick={() => refetch()}>
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
