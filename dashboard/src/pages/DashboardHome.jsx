import React from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCompass,
  FiGlobe,
  FiLayers,
  FiRefreshCw,
  FiShield,
  FiZap,
} from 'react-icons/fi';
import ActivityTimeline from '../components/ActivityTimeline';
import QuickStats from '../components/QuickStats';
import ScoreWidget from '../components/ScoreWidget';
import StatCard from '../components/StatCard';
import TopWebsites from '../components/TopWebsites';
import { secondsToHms } from '../utils/formatters';

export default function DashboardHome({ data, error, onRetry, isRefreshing = false }) {
  if (error) {
    return (
      <section className="page-section">
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <div
            style={{
              fontSize: '36px',
              color: 'var(--rose-500)',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <FiAlertTriangle />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>
            Unable to Synchronize Dashboard Data
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '420px', margin: '0 auto 20px auto' }}>
            {error}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
            >
              <FiRefreshCw className={isRefreshing ? 'spin' : ''} /> Retry Connection
            </button>
          )}
        </div>
      </section>
    );
  }

  const totalSecs = data?.total_screen_time_seconds || 0;
  const prodSecs = data?.productive_time_seconds || 0;
  const learnSecs = data?.learning_time_seconds || 0;
  const neutralSecs = data?.neutral_time_seconds || 0;
  const unprodSecs = data?.unproductive_time_seconds || 0;

  const totalScreenTime = secondsToHms(totalSecs);
  const productiveTime = secondsToHms(prodSecs);
  const prodPct = totalSecs > 0 ? Math.round((prodSecs / totalSecs) * 100) : 0;
  const learnPct = totalSecs > 0 ? Math.round((learnSecs / totalSecs) * 100) : 0;
  const neutralPct = totalSecs > 0 ? Math.round((neutralSecs / totalSecs) * 100) : 0;
  const unprodPct = totalSecs > 0 ? Math.round((unprodSecs / totalSecs) * 100) : 0;

  const topApps = data?.top_apps || [];
  const topWebsites = data?.top_websites || [];
  const maxAppSecs = topApps.length > 0 ? Math.max(...topApps.map((a) => a.total_seconds || 1)) : 1;

  return (
    <section className="page-section">
      {/* Top 3 Stat Cards */}
      <div className="grid-3">
        <StatCard
          label="Total Screen Time"
          icon={<FiClock />}
          value={totalScreenTime}
          subtext="Active desk engagement today"
          isPositive={true}
          accentColor="blue"
          badgeText="Active Tracking"
        />
        <StatCard
          label="Productive Time"
          icon={<FiCheckCircle />}
          value={productiveTime}
          subtext={`${prodPct}% of your screen time`}
          isPositive={prodPct >= 50}
          accentColor="emerald"
          badgeText={`${prodPct}% Focused`}
        />
        <ScoreWidget score={data?.productivity_score || 0} />
      </div>

      {/* Category Breakdown Metric Cards */}
      <div className="category-metric-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Productive */}
        <div className="cat-metric-card cat-emerald">
          <div className="cat-metric-top">
            <span className="cat-dot dot-emerald"></span>
            <span className="cat-name">Productive</span>
            <span className="cat-pct">{prodPct}%</span>
          </div>
          <div className="cat-duration">{secondsToHms(prodSecs)}</div>
          <div className="cat-progress-track">
            <div className="cat-progress-bar bar-emerald" style={{ width: `${prodPct}%` }}></div>
          </div>
        </div>

        {/* Learning */}
        <div className="cat-metric-card cat-cyan">
          <div className="cat-metric-top">
            <span className="cat-dot dot-cyan"></span>
            <span className="cat-name">Learning</span>
            <span className="cat-pct">{learnPct}%</span>
          </div>
          <div className="cat-duration">{secondsToHms(learnSecs)}</div>
          <div className="cat-progress-track">
            <div className="cat-progress-bar bar-cyan" style={{ width: `${learnPct}%` }}></div>
          </div>
        </div>

        {/* Neutral */}
        <div className="cat-metric-card cat-amber">
          <div className="cat-metric-top">
            <span className="cat-dot dot-amber"></span>
            <span className="cat-name">Neutral</span>
            <span className="cat-pct">{neutralPct}%</span>
          </div>
          <div className="cat-duration">{secondsToHms(neutralSecs)}</div>
          <div className="cat-progress-track">
            <div className="cat-progress-bar bar-amber" style={{ width: `${neutralPct}%` }}></div>
          </div>
        </div>

        {/* Leisure */}
        <div className="cat-metric-card cat-rose">
          <div className="cat-metric-top">
            <span className="cat-dot dot-rose"></span>
            <span className="cat-name">Leisure</span>
            <span className="cat-pct">{unprodPct}%</span>
          </div>
          <div className="cat-duration">{secondsToHms(unprodSecs)}</div>
          <div className="cat-progress-track">
            <div className="cat-progress-bar bar-rose" style={{ width: `${unprodPct}%` }}></div>
          </div>
        </div>
      </div>

      {/* AI Productivity Insights */}
      <QuickStats quickStats={data?.quick_stats} />

      {/* Activity Timeline Chart (Area / Bar with Loader) */}
      <ActivityTimeline timeline={data?.timeline} isLoading={isRefreshing} />

      {/* Bottom Grid: Top Apps + Top Websites */}
      <div className="grid-2">
        {/* Top Applications */}
        <div className="card app-list-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon text-blue">
                <FiLayers />
              </span>
              Top Applications
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Active Time Spent
            </span>
          </div>

          {topApps.length > 0 ? (
            <div className="app-usage-list">
              {topApps.map((app, idx) => {
                const pct = Math.round((app.total_seconds / maxAppSecs) * 100);
                const colorClass = app.productivity || 'neutral';
                return (
                  <div key={idx} className="usage-item-modern">
                    <div className="usage-info-row">
                      <div className="usage-app-badge">
                        <span className="app-icon-avatar">
                          <FiLayers />
                        </span>
                        <span className="usage-name">{app.app_name}</span>
                        <span className={`badge-pill badge-${colorClass}`}>
                          {app.productivity || 'neutral'}
                        </span>
                      </div>
                      <span className="usage-duration-text">
                        {secondsToHms(app.total_seconds)}
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
              <FiLayers className="empty-icon text-muted" />
              <p>No application events recorded yet today.</p>
            </div>
          )}
        </div>

        {/* Top Websites */}
        <TopWebsites websites={topWebsites} />
      </div>
    </section>
  );
}
