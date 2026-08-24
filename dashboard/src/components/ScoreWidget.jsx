import React from 'react';
import { FiAward, FiInfo, FiTrendingUp, FiZap } from 'react-icons/fi';

export default function ScoreWidget({ score = 0 }) {
  const roundedScore = Math.min(100, Math.max(0, Math.round(score)));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (roundedScore / 100) * circumference;

  // Dynamic Level Pill & Color Theme
  let themeColor = '#10B981';
  let gradientId = 'emeraldGrad';
  let badgeText = 'Supercharged Flow';
  let badgeIcon = <FiZap className="text-emerald" />;
  let badgeBg = 'var(--emerald-50)';
  let badgeBorder = '#A7F3D0';
  let badgeColor = '#047857';

  if (roundedScore >= 80) {
    themeColor = '#10B981';
    gradientId = 'emeraldGrad';
    badgeText = 'Supercharged Flow';
    badgeIcon = <FiZap />;
    badgeBg = '#ECFDF5';
    badgeBorder = '#A7F3D0';
    badgeColor = '#047857';
  } else if (roundedScore >= 60) {
    themeColor = '#3B82F6';
    gradientId = 'blueGrad';
    badgeText = 'Steady Productivity';
    badgeIcon = <FiZap />;
    badgeBg = '#EFF6FF';
    badgeBorder = '#BFDBFE';
    badgeColor = '#1D4ED8';
  } else if (roundedScore >= 40) {
    themeColor = '#F59E0B';
    gradientId = 'amberGrad';
    badgeText = 'Moderate Focus';
    badgeIcon = <FiZap />;
    badgeBg = '#FFFBEB';
    badgeBorder = '#FDE68A';
    badgeColor = '#B45309';
  } else {
    themeColor = '#F43F5E';
    gradientId = 'roseGrad';
    badgeText = 'Distracted Session';
    badgeIcon = <FiInfo />;
    badgeBg = '#FFF1F2';
    badgeBorder = '#FECDD3';
    badgeColor = '#BE123C';
  }

  return (
    <div className="card stat-card score-card">
      <div className="card-header">
        <span className="stat-label">Productivity Score</span>
        <span className="card-icon text-emerald" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <FiAward />
        </span>
      </div>

      <div className="score-widget-body">
        {/* Radial SVG Meter */}
        <div className="score-circle-container">
          <svg className="score-circle-svg" width="96" height="96" viewBox="0 0 96 96">
            <defs>
              <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
              <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F43F5E" />
                <stop offset="100%" stopColor="#E11D48" />
              </linearGradient>
            </defs>

            {/* Background Track */}
            <circle
              className="score-circle-bg"
              cx="48"
              cy="48"
              r={radius}
              strokeWidth="7"
            ></circle>

            {/* Glowing Active Ring */}
            <circle
              className="score-circle-bar"
              cx="48"
              cy="48"
              r={radius}
              strokeWidth="7"
              strokeLinecap="round"
              style={{
                strokeDasharray: `${circumference} ${circumference}`,
                strokeDashoffset: offset,
                stroke: `url(#${gradientId})`,
              }}
            ></circle>
          </svg>

          {/* Centered Number */}
          <div className="score-text-container">
            <span className="score-num">{roundedScore}</span>
            <span className="score-max">/100</span>
          </div>
        </div>

        {/* Text and Badge Details */}
        <div className="score-meta">
          <div
            className="score-badge"
            style={{
              backgroundColor: badgeBg,
              borderColor: badgeBorder,
              color: badgeColor,
            }}
          >
            {badgeIcon}
            <span>{badgeText}</span>
          </div>
          <div className="score-desc">
            Rules engine scored from active focus vs distraction ratios.
          </div>
        </div>
      </div>
    </div>
  );
}
