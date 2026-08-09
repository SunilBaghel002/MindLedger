import React from 'react';

export default function StatCard({ label, icon, value, subtext, isPositive }) {
  return (
    <div className="card stat-card">
      <div className="card-header">
        <span className="stat-label">{label}</span>
        <span className="card-icon">{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className={`stat-subtext ${isPositive ? 'positive' : ''}`}>
        {subtext}
      </div>
    </div>
  );
}
