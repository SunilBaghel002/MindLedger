import React from 'react';
import { FiGlobe } from 'react-icons/fi';
import { secondsToHms } from '../utils/formatters';

export default function TopWebsites({ websites = [] }) {
  const maxSecs = websites.length > 0 ? Math.max(...websites.map((w) => w.total_seconds || 1)) : 1;

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <span className="card-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><FiGlobe /></span> Top Websites
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Browse time
        </span>
      </div>

      {websites.length > 0 ? (
        <div>
          {websites.map((site, idx) => {
            const pct = Math.round((site.total_seconds / maxSecs) * 100);
            const colorClass = site.productivity || 'neutral';
            return (
              <div key={idx} className="usage-item">
                <div className="usage-meta">
                  <span className="usage-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiGlobe style={{ color: 'var(--primary-blue)' }} /> {site.domain}
                  </span>
                  <span className="usage-duration">
                    {secondsToHms(site.total_seconds)}
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${colorClass}`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><FiGlobe /></div>
          <div className="empty-title">No web browsing recorded yet</div>
        </div>
      )}
    </div>
  );
}
