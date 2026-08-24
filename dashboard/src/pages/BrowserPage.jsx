import React, { useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiCompass,
  FiExternalLink,
  FiFilter,
  FiGlobe,
  FiLink,
  FiPieChart,
  FiSearch,
  FiStar,
  FiTrendingUp,
} from 'react-icons/fi';
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
  const topSiteDuration = domainsList.length > 0 ? secondsToHms(domainsList[0].total_seconds) : 'No data';
  const topMostVisited = domainsList.slice(0, 5);
  const maxDomainSecs = domainsList.length > 0 ? Math.max(...domainsList.map((d) => d.total_seconds || 1)) : 1;

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
            aria-label="Filter websites by category"
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
          <span className="shimmer-text">Loading browser analytics...</span>
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
              label="Total Browsing Time"
              icon={<FiGlobe />}
              value={totalTimeStr}
              subtext={`Range: ${rangePreset.toUpperCase()}`}
              isPositive={true}
              variant="indigo"
            />
            <StatCard
              label="Unique Domains Visited"
              icon={<FiLink />}
              value={domainsCount.toString()}
              subtext="Distinct website domains"
              isPositive={true}
              variant="emerald"
            />
            <StatCard
              label="Top Website"
              icon={<FiStar />}
              value={topSite}
              subtext={topSiteDuration}
              isPositive={true}
              variant="amber"
            />
          </div>

          {/* Grid: Most Visited Sites + Category Donut */}
          <div className="grid-2" style={{ gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)', alignItems: 'start' }}>
            <div className="card" style={{ padding: '20px 24px' }}>
              <div className="card-header" style={{ marginBottom: '18px' }}>
                <h2 className="card-title">
                  <span className="card-icon text-indigo">
                    <FiTrendingUp />
                  </span>{' '}
                  Most Visited Websites
                </h2>
                <span className="badge badge-neutral" style={{ fontSize: '11px', fontWeight: '700' }}>
                  Top {topMostVisited.length} sites
                </span>
              </div>

              {topMostVisited.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {topMostVisited.map((item, idx) => {
                    const prod = (item.productivity || item.category || 'neutral').toLowerCase();
                    const badgeClass =
                      prod === 'productive'
                        ? 'badge-productive'
                        : prod === 'unproductive'
                        ? 'badge-unproductive'
                        : 'badge-neutral';
                    const barPct = Math.round((item.total_seconds / maxDomainSecs) * 100);

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
                                background: '#F0FDF4',
                                color: '#16A34A',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: '700',
                              }}
                            >
                              <FiGlobe />
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>
                                {item.domain}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span className={`badge ${badgeClass}`} style={{ fontSize: '10px' }}>
                                  {item.category || item.productivity || 'Browsing'}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                  {item.visit_count} visits
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)' }}>
                              {secondsToHms(item.total_seconds)}
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
                    <FiGlobe />
                  </div>
                  <div className="empty-title">No top websites recorded</div>
                </div>
              )}
            </div>

            <CategoryDonut breakdown={donutData} />
          </div>

          {/* Detailed Domain List Table */}
          <div className="card" style={{ padding: '22px 24px' }}>
            <div className="card-header" style={{ marginBottom: '18px' }}>
              <h2 className="card-title">
                <span className="card-icon text-indigo">
                  <FiPieChart />
                </span>{' '}
                All Visited Domains
              </h2>
              <span className="badge badge-neutral" style={{ fontSize: '11px', fontWeight: '700' }}>
                {domainsList.length} domains
              </span>
            </div>

            {domainsList.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table
                  className="data-table"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                        Domain
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                        Category
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                        Visits
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', width: '200px' }}>
                        Usage Share
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#475569',
                          textAlign: 'right',
                        }}
                      >
                        Time Spent
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#475569',
                          textAlign: 'center',
                        }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {domainsList.map((item, idx) => {
                      const pct = Math.min(100, Math.round((item.total_seconds / totalBrowsingSecs) * 100));
                      const prod = (item.productivity || item.category || 'neutral').toLowerCase();
                      const badgeClass =
                        prod === 'productive'
                          ? 'badge-productive'
                          : prod === 'unproductive'
                          ? 'badge-unproductive'
                          : 'badge-neutral';

                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '14px 16px', fontWeight: '600' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  background: '#EEF2FF',
                                  color: '#4F46E5',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                }}
                              >
                                <FiGlobe />
                              </span>
                              <span style={{ color: 'var(--text-main)', fontSize: '13px' }}>{item.domain}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className={`badge ${badgeClass}`} style={{ fontSize: '11px' }}>
                              {item.category || item.productivity || 'browsing'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                            {item.visit_count}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="progress-track" style={{ flex: 1, height: '6px' }}>
                                <div
                                  className={`progress-fill ${prod}`}
                                  style={{ width: `${Math.max(pct, 2)}%` }}
                                ></div>
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', width: '32px' }}>
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>
                            {secondsToHms(item.total_seconds)}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <button
                              onClick={() => setSelectedDomainModal(item.domain)}
                              className="btn-header-refresh"
                              style={{
                                padding: '5px 12px',
                                fontSize: '12px',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              <FiSearch /> Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <FiGlobe />
                </div>
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

