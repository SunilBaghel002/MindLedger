import React, { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import CategoryDonut from '../components/CategoryDonut';
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
  { id: 'educational', label: 'Educational' },
  { id: 'tech', label: 'Tech & Dev' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'music', label: 'Music' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'news', label: 'News' },
];

export default function YoutubePage() {
  const [rangePreset, setRangePreset] = useState('today');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      api
        .getYoutubeAnalytics(rangePreset, categoryFilter, searchQuery)
        .then((data) => {
          if (isMounted) {
            setAnalyticsData(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err.message || 'Failed to fetch YouTube analytics');
            setLoading(false);
          }
        });
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [rangePreset, categoryFilter, searchQuery]);

  const totalTimeStr = secondsToHms(analyticsData?.total_watch_seconds || 0);
  const shortsPct = analyticsData?.shorts_ratio_pct || 0;
  const channelsList = analyticsData?.top_channels || [];
  const historyList = analyticsData?.history || [];
  const totalWatchSecs = analyticsData?.total_watch_seconds || 1;

  // Format category breakdown for donut chart
  const donutData = {
    productive_time_seconds: analyticsData?.productive_watch_seconds || 0,
    learning_time_seconds: analyticsData?.category_breakdown?.educational || analyticsData?.category_breakdown?.tech || 0,
    neutral_time_seconds: analyticsData?.category_breakdown?.music || 0,
    unproductive_time_seconds: analyticsData?.entertainment_watch_seconds || 0,
  };

  return (
    <section className="page-section">
      {/* Controls Bar: Range Pills + Category Filter + Search Box */}
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

        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search titles or channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search YouTube titles or channels"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '13px',
              width: '220px',
            }}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter YouTube videos by category"
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
          <p style={{ color: 'var(--text-muted)' }}>Loading YouTube watch analytics...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      ) : (
        <>
          {/* Metric Stat Cards */}
          <div className="grid-3">
            <StatCard
              label="Total YouTube Watch Time"
              icon="📺"
              value={totalTimeStr}
              subtext={`Selected range (${rangePreset})`}
              isPositive={true}
            />
            <StatCard
              label="Shorts vs Longform"
              icon="⚡"
              value={`${shortsPct}% Shorts`}
              subtext={`${secondsToHms(analyticsData?.shorts_watch_seconds || 0)} Shorts / ${secondsToHms(analyticsData?.longform_watch_seconds || 0)} Longform`}
              isPositive={shortsPct < 30}
            />
            <StatCard
              label="Productive Watch Time"
              icon="🎓"
              value={secondsToHms(analyticsData?.productive_watch_seconds || 0)}
              subtext={`Vs ${secondsToHms(analyticsData?.entertainment_watch_seconds || 0)} Entertainment`}
              isPositive={true}
            />
          </div>

          {/* Grid: Top Channels Table + Category Donut */}
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <span className="card-icon">👑</span> Top Channels Watched
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {channelsList.length} channels
                </span>
              </div>

              {channelsList.length > 0 ? (
                <div>
                  {channelsList.slice(0, 6).map((item, idx) => {
                    const pct = Math.min(100, Math.round((item.total_seconds / totalWatchSecs) * 100));
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 0',
                          borderBottom: idx < channelsList.length - 1 ? '1px solid var(--border-light)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '18px' }}>▶️</span>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-main)' }}>
                              {item.channel_name || 'Unknown Channel'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {item.total_videos} videos • {pct}% of watch time
                            </div>
                          </div>
                        </div>
                        <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-main)' }}>
                          {secondsToHms(item.total_seconds)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📺</div>
                  <div className="empty-title">No channel records found</div>
                </div>
              )}
            </div>

            <CategoryDonut breakdown={donutData} />
          </div>

          {/* Searchable Video Watch History List */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-icon">📜</span> Video Watch History
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {historyList.length} watched videos
              </span>
            </div>

            {historyList.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Video Title & Channel</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Watch Time</th>
                    <th style={{ textAlign: 'right' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((item, idx) => {
                    const videoUrl = item.video_url || (item.video_id ? `https://youtube.com/watch?v=${item.video_id}` : '#');
                    return (
                      <tr key={idx}>
                        <td style={{ maxWidth: '380px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '2px' }}>
                            {item.video_title || 'Untitled YouTube Video'}
                          </div>
                          <div style={{ fontSize: '12px', display: 'flex', gap: '8px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{item.channel_name || 'Unknown Channel'}</span>
                            {videoUrl !== '#' && (
                              <a
                                href={videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--primary-blue)', textDecoration: 'none' }}
                              >
                                Watch 🔗
                              </a>
                            )}
                          </div>
                        </td>
                        <td>
                          {item.is_short ? (
                            <span className="badge badge-unproductive">⚡ Short</span>
                          ) : (
                            <span className="badge badge-productive">📹 Video</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-neutral">
                            {item.video_category || 'uncategorized'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                          {secondsToHms(item.watch_duration_seconds)}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {item.started_at ? item.started_at.split('T')[1]?.substring(0, 5) || item.date : item.date}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No watched videos matching query</div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
