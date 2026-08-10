import React from 'react';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiLayers, FiRefreshCw, FiZap } from 'react-icons/fi';
import ActivityTimeline from '../components/ActivityTimeline';
import CategoryDonut from '../components/CategoryDonut';
import QuickStats from '../components/QuickStats';
import ScoreWidget from '../components/ScoreWidget';
import StatCard from '../components/StatCard';
import TopWebsites from '../components/TopWebsites';
import { secondsToHms } from '../utils/formatters';

export default function DashboardHome({ data, error, onRetry }) {
  if (error) {
    return (
      <section className="page-section">
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '32px', color: 'var(--color-unproductive)', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
            <FiAlertTriangle />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            Failed to load dashboard data
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            {error}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--primary-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FiRefreshCw /> Retry
            </button>
          )}
        </div>
      </section>
    );
  }

  const totalScreenTime = secondsToHms(data?.total_screen_time_seconds || 0);
  const productiveTime = secondsToHms(data?.productive_time_seconds || 0);
  const totalSecs = data?.total_screen_time_seconds || 0;
  const prodSecs = data?.productive_time_seconds || 0;
  const prodPct = totalSecs > 0 ? Math.round((prodSecs / totalSecs) * 100) : 0;
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
          subtext="Active tracking today"
          isPositive={true}
        />
        <StatCard
          label="Productive Time"
          icon={<FiCheckCircle />}
          value={productiveTime}
          subtext={`${prodPct}% of total screen time`}
          isPositive={prodPct >= 50}
        />
        <ScoreWidget score={data?.productivity_score || 0} />
      </div>

      {/* Quick Stats / AI Insights */}
      <QuickStats quickStats={data?.quick_stats} />

      {/* Activity Timeline Chart */}
      <ActivityTimeline timeline={data?.timeline} />

      {/* Bottom Grid: Top Apps + Top Websites */}
      <div className="grid-2">
        {/* Top Applications */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><FiLayers /></span> Top Applications
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Time spent
            </span>
          </div>

          {topApps.length > 0 ? (
            <div>
              {topApps.map((app, idx) => {
                const pct = Math.round((app.total_seconds / maxAppSecs) * 100);
                const colorClass = app.productivity || 'neutral';
                return (
                  <div key={idx} className="usage-item">
                    <div className="usage-meta">
                      <span className="usage-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiLayers style={{ color: 'var(--primary-blue)' }} /> {app.app_name}
                      </span>
                      <span className="usage-duration">
                        {secondsToHms(app.total_seconds)}
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
              <div className="empty-icon"><FiLayers /></div>
              <div className="empty-title">No application sessions yet</div>
            </div>
          )}
        </div>

        {/* Top Websites */}
        <TopWebsites websites={topWebsites} />
      </div>

      {/* Category Breakdown Donut */}
      <CategoryDonut breakdown={data} />
    </section>
  );
}
