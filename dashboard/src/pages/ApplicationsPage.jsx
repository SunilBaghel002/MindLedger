import React, { useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiAward,
  FiClock,
  FiFilter,
  FiLayers,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi';
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

    const loadAppData = (showLoading = false) => {
      if (showLoading && !analyticsData) {
        setLoading(true);
        setError(null);
      }
      api
        .getAppAnalytics(rangePreset, categoryFilter)
        .then((data) => {
          if (isMounted) {
            setAnalyticsData(data);
            setLoading(false);
            setError(null);
          }
        })
        .catch((err) => {
          if (isMounted) {
            if (!analyticsData) {
              setError(err.message || 'Failed to fetch application analytics');
            }
            setLoading(false);
          }
        });
    };

    loadAppData(true);

    const interval = setInterval(() => {
      if (!document.hidden) {
        loadAppData(false);
      }
    }, 5000);

    const handleVisibility = () => {
      if (!document.hidden) {
        loadAppData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [rangePreset, categoryFilter]);

  const totalSecs = analyticsData?.total_screen_time_seconds || 0;
  const totalTimeStr = secondsToHms(totalSecs);
  const appsCount = analyticsData?.total_apps_count || 0;
  const appsList = analyticsData?.top_apps || [];
  const topAppName = appsList.length > 0 ? appsList[0].app_name : 'None';
  const topAppDuration = appsList.length > 0 ? secondsToHms(appsList[0].total_seconds) : 'No data';
  const maxSecs = appsList.length > 0 ? Math.max(...appsList.map((a) => a.total_seconds || 1)) : 1;

  // Format category breakdown for donut chart
  const donutData = {
    productive_time_seconds: analyticsData?.category_breakdown?.productive || 0,
    learning_time_seconds: analyticsData?.category_breakdown?.learning || 0,
    neutral_time_seconds: analyticsData?.category_breakdown?.neutral || 0,
    unproductive_time_seconds: analyticsData?.category_breakdown?.unproductive || 0,
  };

  return (
    <section className="page-section" style={{ paddingBottom: 'var(--space-2xl)' }}>
      {/* Controls Bar: Preset Pills + Category Filter */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
          padding: '12px 18px',
          marginBottom: 'var(--space-xl)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div className="btn-group-pill">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setRangePreset(p.id)}
              className={`pill-btn ${rangePreset === p.id ? 'active' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiFilter style={{ color: 'var(--text-muted)', fontSize: '14px' }} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter applications by category"
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-main)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none',
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
        <div className="card timeline-shimmer-loader" style={{ height: '300px' }}>
          <div className="shimmer-wave"></div>
          <span className="shimmer-text">Loading application analytics...</span>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div
            style={{
              fontSize: '36px',
              color: 'var(--color-unproductive)',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <FiAlertTriangle />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{error}</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
            <StatCard
              label="Total Screen Time"
              icon={<FiClock />}
              value={totalTimeStr}
              subtext={`Range: ${rangePreset.toUpperCase()}`}
              isPositive={true}
              variant="indigo"
            />
            <StatCard
              label="Tracked Applications"
              icon={<FiLayers />}
              value={appsCount.toString()}
              subtext="Distinct processes recorded"
              isPositive={true}
              variant="emerald"
            />
            <StatCard
              label="Top Application"
              icon={<FiAward />}
              value={topAppName}
              subtext={topAppDuration}
              isPositive={true}
              variant="amber"
            />
          </div>

          {/* Upgraded Trend / Comparison Chart */}
          <AppTrendChart trend={analyticsData?.trend || []} topApps={appsList} />

          {/* Apps List + Category Donut */}
          <div className="grid-2" style={{ gap: 'var(--space-xl)', alignItems: 'start' }}>
            <div className="card" style={{ padding: '20px 24px' }}>
              <div className="card-header" style={{ marginBottom: '18px' }}>
                <h2 className="card-title">
                  <span className="card-icon text-indigo">
                    <FiLayers />
                  </span>{' '}
                  Tracked Applications
                </h2>
                <span className="badge badge-neutral" style={{ fontSize: '11px', fontWeight: '700' }}>
                  {appsList.length} apps
                </span>
              </div>

              {appsList.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {appsList.map((app, idx) => {
                    const pct = Math.round((app.total_seconds / (totalSecs || 1)) * 100);
                    const barPct = Math.round((app.total_seconds / maxSecs) * 100);
                    const prod = (app.productivity || 'neutral').toLowerCase();
                    const badgeClass =
                      prod === 'productive'
                        ? 'badge-productive'
                        : prod === 'unproductive'
                        ? 'badge-unproductive'
                        : 'badge-neutral';

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: '#EEF2FF',
                                color: '#4F46E5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: '700',
                              }}
                            >
                              {app.app_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>
                                {app.app_name}
                              </div>
                              <span className={`badge ${badgeClass}`} style={{ fontSize: '10px', marginTop: '2px' }}>
                                {app.category || app.productivity || 'Neutral'}
                              </span>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)' }}>
                              {secondsToHms(app.total_seconds)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                              {pct}% of total
                            </div>
                          </div>
                        </div>

                        <div className="progress-track" style={{ height: '6px', marginTop: '2px' }}>
                          <div
                            className={`progress-fill ${prod}`}
                            style={{ width: `${Math.max(barPct, 2)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <FiLayers />
                  </div>
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

