import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiGlobe, FiLink, FiPieChart, FiSearch, FiStar, FiTrendingUp } from 'react-icons/fi';
import CategoryDonut from '../components/CategoryDonut';
import StatCard from '../components/StatCard';
import URLDetailModal from '../components/URLDetailModal';
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

export default function BrowserPage() {
  const [rangePreset, setRangePreset] = useState('today');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedDomainModal, setSelectedDomainModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadBrowserData = (showLoading = false) => {
      if (showLoading && !analyticsData) {
        setLoading(true);
        setError(null);
      }
      api
        .getBrowserAnalytics(rangePreset, categoryFilter)
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
              setError(err.message || 'Failed to fetch browser analytics');
            }
            setLoading(false);
          }
        });
    };

    loadBrowserData(true);

    const interval = setInterval(() => {
      if (!document.hidden) {
        loadBrowserData(false);
      }
    }, 5000);

    const handleVisibility = () => {
      if (!document.hidden) {
        loadBrowserData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [rangePreset, categoryFilter]);

  const totalTimeStr = secondsToHms(analyticsData?.total_browsing_seconds || 0);
  const totalBrowsingSecs = analyticsData?.total_browsing_seconds || 1;
  const domainsCount = analyticsData?.unique_domains_count || 0;
  const domainsList = analyticsData?.top_domains || [];
  const topSite = domainsList.length > 0 ? domainsList[0].domain : 'None';
  const topMostVisited = domainsList.slice(0, 5);

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
            aria-label="Filter websites by category"
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
          <p style={{ color: 'var(--text-muted)' }}>Loading browser analytics...</p>
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
              label="Total Browsing Time"
              icon={<FiGlobe />}
              value={totalTimeStr}
              subtext={`Selected range (${rangePreset})`}
              isPositive={true}
            />
            <StatCard
              label="Unique Domains Visited"
              icon={<FiLink />}
              value={domainsCount.toString()}
              subtext="Distinct website domains"
              isPositive={true}
            />
            <StatCard
              label="Top Website"
              icon={<FiStar />}
              value={topSite}
              subtext={domainsList.length > 0 ? secondsToHms(domainsList[0].total_seconds) : 'No data'}
              isPositive={true}
            />
          </div>

          {/* Grid: Most Visited Sites + Category Donut */}
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <span className="card-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><FiTrendingUp /></span> Most Visited Websites
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Top 5 sites
                </span>
              </div>

              {topMostVisited.length > 0 ? (
                <div>
                  {topMostVisited.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 0',
                        borderBottom: idx < topMostVisited.length - 1 ? '1px solid var(--border-light)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center' }}><FiGlobe /></span>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-main)' }}>
                            {item.domain}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {item.visit_count} visit sessions
                          </div>
                        </div>
                      </div>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {secondsToHms(item.total_seconds)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon"><FiGlobe /></div>
                  <div className="empty-title">No top websites recorded</div>
                </div>
              )}
            </div>

            <CategoryDonut breakdown={donutData} />
          </div>

          {/* Detailed Domain List Table */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><FiPieChart /></span> All Visited Domains
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {domainsList.length} domains
              </span>
            </div>

            {domainsList.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Category</th>
                    <th>Visits</th>
                    <th>Usage Share</th>
                    <th style={{ textAlign: 'right' }}>Time Spent</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {domainsList.map((item, idx) => {
                    const pct = Math.min(100, Math.round((item.total_seconds / totalBrowsingSecs) * 100));
                    const colorClass = item.productivity || 'neutral';
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FiGlobe style={{ color: 'var(--primary-blue)' }} /> {item.domain}</span>
                        </td>
                        <td>
                          <span className={`badge badge-${colorClass}`}>
                            {item.category || item.productivity || 'neutral'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {item.visit_count}
                        </td>
                        <td style={{ width: '180px' }}>
                          <div className="progress-track">
                            <div
                              className={`progress-fill ${colorClass}`}
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            ></div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                          {secondsToHms(item.total_seconds)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedDomainModal(item.domain)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--primary-blue)',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <FiSearch /> Inspect URLs
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><FiGlobe /></div>
                <div className="empty-title">No domain records found for selected filters</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* URL Inspection Detail Modal */}
      {selectedDomainModal && (
        <URLDetailModal
          domain={selectedDomainModal}
          rangePreset={rangePreset}
          onClose={() => setSelectedDomainModal(null)}
        />
      )}
    </section>
  );
}
