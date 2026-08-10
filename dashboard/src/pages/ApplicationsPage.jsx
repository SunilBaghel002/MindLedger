import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiAward, FiClock, FiLayers } from 'react-icons/fi';
import AppTrendChart from '../components/AppTrendChart';
import CategoryDonut from '../components/CategoryDonut';
import StatCard from '../components/StatCard';
import { api } from '../services/api';
import { secondsToHms } from '../utils/formatters';

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'productive', label: 'Productive' },
  { id: 'learning', label: 'Learning' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'unproductive', label: 'Unproductive' },
];

export default function ApplicationsPage() {
  const [rangePreset, setRangePreset] = useState('today');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getAppAnalytics(rangePreset, categoryFilter)
      .then((data) => {
        if (isMounted) {
          setAnalyticsData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch application analytics');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [rangePreset, categoryFilter]);

  const totalTimeStr = secondsToHms(analyticsData?.total_screen_time_seconds || 0);
  const appsCount = analyticsData?.total_apps_count || 0;
  const appsList = analyticsData?.top_apps || [];
  const topAppName = appsList.length > 0 ? appsList[0].app_name : 'None';
  const maxSecs = appsList.length > 0 ? Math.max(...appsList.map((a) => a.total_seconds || 1)) : 1;

  // Format category breakdown for donut chart
  const donutData = {
    productive_time_seconds: analyticsData?.category_breakdown?.productive || 0,
    learning_time_seconds: analyticsData?.category_breakdown?.learning || 0,
    neutral_time_seconds: analyticsData?.category_breakdown?.neutral || 0,
    unproductive_time_seconds: analyticsData?.category_breakdown?.unproductive || 0,
  };

  return (
    <section className="page-section">
      {/* Controls Bar: Preset Pills + Category Filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setRangePreset(p.id)}
              aria-pressed={rangePreset === p.id}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: rangePreset === p.id ? 'var(--primary-blue)' : 'var(--bg-card)',
                color: rangePreset === p.id ? '#fff' : 'var(--text-secondary)',
                fontWeight: rangePreset === p.id ? '600' : '500',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter applications by category"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="skeleton-loader" style={{ width: '60%', margin: '0 auto 12px' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading application analytics...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '32px', color: 'var(--color-unproductive)', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
            <FiAlertTriangle />
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid-3">
            <StatCard
              label="Total Screen Time"
              icon={<FiClock />}
              value={totalTimeStr}
              subtext={`Selected range (${rangePreset})`}
              isPositive={true}
            />
            <StatCard
              label="Tracked Applications"
              icon={<FiLayers />}
              value={appsCount.toString()}
              subtext="Distinct applications"
              isPositive={true}
            />
            <StatCard
              label="Top Application"
              icon={<FiAward />}
              value={topAppName}
              subtext={appsList.length > 0 ? secondsToHms(appsList[0].total_seconds) : 'No data'}
              isPositive={true}
            />
          </div>

          {/* Trend Chart */}
          <AppTrendChart trend={analyticsData?.trend} />

          {/* Apps List + Category Donut */}
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <span className="card-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><FiLayers /></span> Applications List
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {appsList.length} applications
                </span>
              </div>

              {appsList.length > 0 ? (
                <div>
                  {appsList.map((app, idx) => {
                    const pct = Math.round((app.total_seconds / maxSecs) * 100);
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
                  <div className="empty-title">No applications found for selected filters</div>
                </div>
              )}
            </div>

            <CategoryDonut breakdown={donutData} />
          </div>
        </>
      )}
    </section>
  );
}
