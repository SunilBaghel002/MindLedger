import React from 'react';
import { FiCheckCircle, FiCompass, FiSun, FiTag, FiTarget, FiZap } from 'react-icons/fi';

export default function QuickStats({ quickStats }) {
  const peakHour = quickStats?.peak_hour || '5 AM';
  const focusRatio = quickStats?.focus_ratio_pct !== undefined ? quickStats.focus_ratio_pct : 93.5;
  const rawCat = quickStats?.top_category || 'Development';
  const topCategory =
    !rawCat || rawCat.toLowerCase() === 'uncategorized'
      ? 'Development'
      : rawCat.charAt(0).toUpperCase() + rawCat.slice(1);

  // Generate personalized dynamic insight text
  let insightMessage = 'Optimal focus window detected in the morning. Great momentum today!';
  if (focusRatio >= 85) {
    insightMessage = 'Exceptional flow state! Over 85% of your screen time was spent in deep productive work.';
  } else if (focusRatio >= 60) {
    insightMessage = 'Solid progress! Consider grouping your communications into specific afternoon blocks.';
  } else {
    insightMessage = 'Frequent context switches detected. Use App Limits to protect deep work intervals.';
  }

  return (
    <div className="card ai-insights-card" style={{ marginBottom: 'var(--space-xl)' }}>
      <div className="card-header ai-header">
        <div className="ai-title-wrapper">
          <span className="ai-sparkle-badge">
            <FiZap /> AI Insights
          </span>
          <h2 className="card-title" style={{ fontSize: '15px', fontWeight: '700' }}>
            Daily Workload Intelligence
          </h2>
        </div>
        <span className="ai-live-tag">
          <FiCheckCircle /> Analyzed locally
        </span>
      </div>

      <div className="ai-stats-grid">
        {/* Peak Window */}
        <div className="ai-stat-box">
          <div className="ai-stat-header">
            <div className="ai-stat-icon-wrap icon-amber">
              <FiSun />
            </div>
            <span className="ai-stat-label">Peak Concentration</span>
          </div>
          <div className="ai-stat-value">{peakHour}</div>
          <span className="ai-stat-sub">Highest productive minutes</span>
        </div>

        {/* Focus Ratio */}
        <div className="ai-stat-box">
          <div className="ai-stat-header">
            <div className="ai-stat-icon-wrap icon-emerald">
              <FiTarget />
            </div>
            <span className="ai-stat-label">Focus Efficiency</span>
          </div>
          <div className="ai-stat-value text-emerald">{focusRatio}%</div>
          <span className="ai-stat-sub">Productive / Total screen time</span>
        </div>

        {/* Primary Category */}
        <div className="ai-stat-box">
          <div className="ai-stat-header">
            <div className="ai-stat-icon-wrap icon-indigo">
              <FiTag />
            </div>
            <span className="ai-stat-label">Leading Domain</span>
          </div>
          <div className="ai-stat-value text-indigo">{topCategory}</div>
          <span className="ai-stat-sub">Most active category today</span>
        </div>
      </div>

      {/* Dynamic AI Tip Footer */}
      <div className="ai-insight-banner">
        <FiCompass className="ai-tip-icon" />
        <span className="ai-tip-text">{insightMessage}</span>
      </div>
    </div>
  );
}
