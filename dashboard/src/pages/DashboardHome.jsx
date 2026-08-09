import React from 'react';
import StatCard from '../components/StatCard';
import ScoreWidget from '../components/ScoreWidget';
import ActivityTimeline from '../components/ActivityTimeline';
import CategoryDonut from '../components/CategoryDonut';
import { secondsToHms } from '../utils/formatters';

export default function DashboardHome({ data }) {
  const totalScreenTime = secondsToHms(data?.total_screen_time_seconds || 0);
  const productiveTime = secondsToHms(data?.productive_time_seconds || 0);
  const totalSecs = data?.total_screen_time_seconds || 0;
  const prodSecs = data?.productive_time_seconds || 0;
  const prodPct = totalSecs > 0 ? Math.round((prodSecs / totalSecs) * 100) : 0;
  const topApps = data?.top_apps || [];
  const maxAppSecs = topApps.length > 0 ? Math.max(...topApps.map((a) => a.total_seconds || 1)) : 1;

  return (
    <section className="page-section">
      {/* Top 3 Stat Cards */}
      <div className="grid-3">
        <StatCard
          label="Total Screen Time"
          icon="⏱️"
          value={totalScreenTime}
          subtext="Active tracking today"
          isPositive={true}
        />
        <StatCard
          label="Productive Time"
          icon="🎯"
          value={productiveTime}
          subtext={`${prodPct}% of total screen time`}
          isPositive={prodPct >= 50}
        />
        <ScoreWidget score={data?.productivity_score || 0} />
      </div>

      {/* Activity Timeline Chart */}
      <ActivityTimeline />

      {/* Bottom Grid: Top Apps + Category Breakdown */}
      <div className="grid-2">
        {/* Top Applications */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">💻</span> Top Applications
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
                      <span className="usage-name">💻 {app.app_name}</span>
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
              <div className="empty-icon">📱</div>
              <div className="empty-title">No application sessions yet</div>
            </div>
          )}
        </div>

        {/* Category Breakdown Donut */}
        <CategoryDonut breakdown={data} />
      </div>
    </section>
  );
}
