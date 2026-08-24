import React from 'react';
import { FiAward } from 'react-icons/fi';

export default function ScoreWidget({ score = 0 }) {
  const roundedScore = Math.round(score);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (roundedScore / 100) * circumference;

  let strokeColor = 'var(--color-productive)';
  if (roundedScore < 40) strokeColor = 'var(--color-unproductive)';
  else if (roundedScore < 70) strokeColor = 'var(--color-neutral)';

  return (
    <div className="card stat-card">
      <div className="card-header">
        <span className="stat-label">Productivity Score</span>
        <span className="card-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><FiAward /></span>
      </div>
      <div className="score-widget">
        <div className="score-circle-container">
          <svg className="score-circle-svg" width="90" height="90" viewBox="0 0 90 90">
            <circle className="score-circle-bg" cx="45" cy="45" r="36"></circle>
            <circle
              className="score-circle-bar"
              cx="45"
              cy="45"
              r="36"
              style={{
                strokeDasharray: `${circumference} ${circumference}`,
                strokeDashoffset: offset,
                stroke: strokeColor,
              }}
            ></circle>
          </svg>
          <div className="score-text-container">
            <span className="score-num">{roundedScore}</span>
            <span className="score-max">/100</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
            Daily Index
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Based on rules engine
          </div>
        </div>
      </div>
    </div>
  );
}
