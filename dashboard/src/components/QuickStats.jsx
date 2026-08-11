import React from 'react';
import { FiSun, FiTag, FiTarget, FiZap } from 'react-icons/fi';

export default function QuickStats({ quickStats }) {
  const peakHour = quickStats?.peak_hour || 'N/A';
  const focusRatio = quickStats?.focus_ratio_pct || 0;
  const rawCat = quickStats?.top_category || 'General';
  const topCategory = (!rawCat || rawCat.toLowerCase() === 'uncategorized')
    ? 'Development'
    : rawCat.charAt(0).toUpperCase() + rawCat.slice(1);

  return (
    <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
      <div className="card-header">
        <h2 className="card-title">
          <span className="card-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><FiZap /></span> AI Productivity Insights
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Today's Quick Summary
        </span>
      </div>

      <div className="grid-3" style={{ marginBottom: 0 }}>
        <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FiSun style={{ color: '#ED8936' }} /> Peak Productivity Window
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
            {peakHour}
          </div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FiTarget style={{ color: 'var(--color-productive)' }} /> Focus Ratio
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-productive)' }}>
            {focusRatio}%
          </div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FiTag style={{ color: 'var(--primary-blue)' }} /> Primary Category
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-blue)' }}>
            {topCategory}
          </div>
        </div>
      </div>
    </div>
  );
}
