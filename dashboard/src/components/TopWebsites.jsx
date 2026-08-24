import React from 'react';
import { FiGlobe } from 'react-icons/fi';
import { secondsToHms } from '../utils/formatters';

export default function TopWebsites({ websites = [] }) {
  const maxSecs = websites.length > 0 ? Math.max(...websites.map((w) => w.total_seconds || 1)) : 1;

  return (
    <div className="card website-list-card">
      <div className="card-header">
        <h2 className="card-title">
          <span className="card-icon text-cyan">
            <FiGlobe />
          </span>
          Top Websites & Domains
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Active Web Browsing
        </span>
      </div>

      {websites.length > 0 ? (
        <div className="website-usage-list">
          {websites.map((site, idx) => {
            const pct = Math.round((site.total_seconds / maxSecs) * 100);
            const colorClass = site.productivity || 'neutral';
            return (
              <div key={idx} className="usage-item-modern">
                <div className="usage-info-row">
                  <div className="usage-app-badge">
                    <span className="app-icon-avatar icon-cyan">
                      <FiGlobe />
                    </span>
                    <span className="usage-name">{site.domain}</span>
                    <span className={`badge-pill badge-${colorClass}`}>
                      {site.productivity || 'neutral'}
                    </span>
                  </div>
                  <span className="usage-duration-text">
                    {secondsToHms(site.total_seconds)}
                  </span>
                </div>
                <div className="app-progress-track">
                  <div
                    className={`app-progress-fill fill-${colorClass}`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state-modern">
          <FiGlobe className="empty-icon text-muted" />
          <p>No browser domain visits recorded yet today.</p>
        </div>
      )}
    </div>
  );
}
