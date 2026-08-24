import React from 'react';

export default function StatCard({
  label,
  icon,
  value,
  subtext,
  isPositive,
  accentColor = 'blue',
  badgeText,
}) {
  return (
    <div className={`card stat-card stat-accent-${accentColor}`}>
      <div className="card-header stat-header">
        <span className="stat-label">{label}</span>
        <div className={`stat-icon-wrapper icon-bg-${accentColor}`}>
          {icon}
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-footer">
        {badgeText ? (
          <span className={`stat-badge ${isPositive ? 'positive' : 'neutral'}`}>
            {badgeText}
          </span>
        ) : null}
        <span className={`stat-subtext ${isPositive ? 'positive' : ''}`}>
          {subtext}
        </span>
      </div>
    </div>
  );
}
