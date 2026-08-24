import React from 'react';
import { FiActivity, FiCalendar, FiRefreshCw } from 'react-icons/fi';
import { formatHeaderDate } from '../utils/formatters';

export default function Header({ title, onRefresh, isRefreshing }) {
  return (
    <header className="top-header">
      <div className="header-left">
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="header-controls">
        {/* Refresh Action Button */}
        {onRefresh && (
          <button
            className={`btn-header-refresh ${isRefreshing ? 'refreshing' : ''}`}
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh dashboard data (Ctrl+R)"
          >
            <FiRefreshCw className={`refresh-icon ${isRefreshing ? 'spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}

        {/* Live Sync Status Pill */}
        <div className="header-pill live-pill">
          <span className="pulse-dot emerald"></span>
          <FiActivity className="pill-icon text-emerald" />
          <span>Live Sync</span>
        </div>

        {/* Current Date Pill */}
        <div className="header-pill date-pill">
          <FiCalendar className="pill-icon text-muted" />
          <span>{formatHeaderDate()}</span>
        </div>
      </div>
    </header>
  );
}
