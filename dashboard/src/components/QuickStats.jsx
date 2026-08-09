import React from 'react';

export default function QuickStats({ quickStats }) {
  const peakHour = quickStats?.peak_hour || 'N/A';
  const focusRatio = quickStats?.focus_ratio_pct || 0;
  const topCategory = quickStats?.top_category || 'General';

  return (
    <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
      <div className="card-header">
        <h2 className="card-title">
          <span className="card-icon">⚡</span> AI Productivity Insights
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Today's Quick Summary
        </span>
      </div>

      <div className="grid-3" style={{ marginBottom: 0 }}>
        <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            🔥 Peak Productivity Window
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
            {peakHour}
          </div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            🎯 Focus Ratio
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-productive)' }}>
            {focusRatio}%
          </div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            📊 Primary Category
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-blue)' }}>
            {topCategory}
          </div>
        </div>
      </div>
    </div>
  );
}
