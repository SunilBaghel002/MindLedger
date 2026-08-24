import React, { useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiAward,
  FiBookOpen,
  FiClock,
  FiExternalLink,
  FiFilter,
  FiList,
  FiPlay,
  FiPlayCircle,
  FiSearch,
  FiVideo,
  FiYoutube,
  FiZap,
} from 'react-icons/fi';
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

    const loadYoutubeData = (showLoading = false) => {
      if (showLoading && !analyticsData) {
        setLoading(true);
        setError(null);
      }
      api
        .getYoutubeAnalytics(rangePreset, categoryFilter, searchQuery)
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
              setError(err.message || 'Failed to fetch YouTube analytics');
            }
            setLoading(false);
          }
        });
    };

    const timer = setTimeout(() => {
      loadYoutubeData(true);
    }, 200);

    const interval = setInterval(() => {
      if (!document.hidden) {
        loadYoutubeData(false);
      }
    }, 5000);

    const handleVisibility = () => {
      if (!document.hidden) {
        loadYoutubeData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [rangePreset, categoryFilter, searchQuery]);

  const totalTimeStr = secondsToHms(analyticsData?.total_watch_seconds || 0);
  const shortsPct = analyticsData?.shorts_ratio_pct || 0;
  const channelsList = analyticsData?.top_channels || [];
  const historyList = analyticsData?.history || [];
  const totalWatchSecs = analyticsData?.total_watch_seconds || 1;
  const maxChannelSecs = channelsList.length > 0 ? Math.max(...channelsList.map((c) => c.total_seconds || 1)) : 1;

  // Format category breakdown for donut chart
  const donutData = {
    productive_time_seconds: analyticsData?.productive_watch_seconds || 0,
    learning_time_seconds:
      analyticsData?.category_breakdown?.educational ||
      analyticsData?.category_breakdown?.tech ||
      analyticsData?.category_breakdown?.learning ||
      0,
    neutral_time_seconds: analyticsData?.category_breakdown?.music || 0,
    unproductive_time_seconds: analyticsData?.entertainment_watch_seconds || 0,
  };

  return (
    <section className="page-section" style={{ paddingBottom: 'var(--space-2xl)' }}>
      {/* Controls Bar: Range Pills + Search Box + Category Filter */}
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

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <FiSearch
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-muted)',
                fontSize: '13px',
              }}
            />
            <input
              type="text"
              placeholder="Search titles or channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search YouTube titles or channels"
              style={{
                padding: '7px 14px 7px 32px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '13px',
                width: '230px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiFilter style={{ color: 'var(--text-muted)', fontSize: '13px' }} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter YouTube videos by category"
              style={{
                padding: '7px 14px',
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
      </div>

      {loading ? (
        <div className="card timeline-shimmer-loader" style={{ height: '300px' }}>
          <div className="shimmer-wave"></div>
          <span className="shimmer-text">Loading YouTube watch analytics...</span>
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
          {/* Metric Stat Cards */}
          <div className="grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
            <StatCard
              label="Total YouTube Watch Time"
              icon={<FiYoutube />}
              value={totalTimeStr}
              subtext={`Range: ${rangePreset.toUpperCase()}`}
              isPositive={true}
              variant="rose"
            />
            <StatCard
              label="Shorts vs Longform"
              icon={<FiZap />}
              value={`${shortsPct}% Shorts`}
              subtext={`${secondsToHms(analyticsData?.shorts_watch_seconds || 0)} Shorts / ${secondsToHms(analyticsData?.longform_watch_seconds || 0)} Long`}
              isPositive={shortsPct < 30}
              variant="amber"
            />
            <StatCard
              label="Productive Learning Time"
              icon={<FiBookOpen />}
              value={secondsToHms(analyticsData?.productive_watch_seconds || 0)}
              subtext={`Learning: ${secondsToHms(analyticsData?.productive_watch_seconds || 0)}`}
              isPositive={true}
              variant="emerald"
            />
          </div>

          {/* Grid: Top Channels Table + Category Donut */}
          <div className="grid-2" style={{ gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)', alignItems: 'start' }}>
            <div className="card" style={{ padding: '20px 24px' }}>
              <div className="card-header" style={{ marginBottom: '18px' }}>
                <h2 className="card-title">
                  <span className="card-icon text-rose">
                    <FiAward />
                  </span>{' '}
                  Top Channels Watched
                </h2>
                <span className="badge badge-neutral" style={{ fontSize: '11px', fontWeight: '700' }}>
                  {channelsList.length} channels
                </span>
              </div>

              {channelsList.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {channelsList.slice(0, 5).map((item, idx) => {
                    const barPct = Math.round((item.total_seconds / maxChannelSecs) * 100);
                    const pctOfTotal = Math.round((item.total_seconds / totalWatchSecs) * 100);

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
                                background: '#FFE4E6',
                                color: '#E11D48',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: '700',
                              }}
                            >
                              <FiYoutube />
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>
                                {item.channel_name || 'Unknown Channel'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                {item.total_videos} videos • {pctOfTotal}% of watch time
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
                            className="progress-fill productive"
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
                    <FiYoutube />
                  </div>
                  <div className="empty-title">No channel records found</div>
                </div>
              )}
            </div>

            <CategoryDonut breakdown={donutData} />
          </div>

          {/* Full-Width Video Watch History Table */}
          <div className="card" style={{ padding: '22px 24px' }}>
            <div className="card-header" style={{ marginBottom: '18px' }}>
              <h2 className="card-title">
                <span className="card-icon text-rose">
                  <FiList />
                </span>{' '}
                Video Watch History
              </h2>
              <span className="badge badge-neutral" style={{ fontSize: '11px', fontWeight: '700' }}>
                {historyList.length} watched videos
              </span>
            </div>

            {historyList.length > 0 ? (
              <div style={{ overflowX: 'auto', width: '100%' }}>
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
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', width: '45%' }}>
                        Video Title & Channel
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', width: '12%' }}>
                        Format
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', width: '15%' }}>
                        Category
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#475569',
                          textAlign: 'right',
                          width: '14%',
                        }}
                      >
                        Watch Time
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#475569',
                          textAlign: 'right',
                          width: '14%',
                        }}
                      >
                        Logged At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((item, idx) => {
                      const videoUrl =
                        item.video_url ||
                        (item.video_id ? `https://youtube.com/watch?v=${item.video_id}` : '#');
                      const prod = (item.productivity || item.video_category || 'learning').toLowerCase();
                      const badgeClass =
                        prod === 'learning' || prod === 'educational' || prod === 'tech'
                          ? 'badge-productive'
                          : prod === 'entertainment' || prod === 'unproductive'
                          ? 'badge-unproductive'
                          : 'badge-neutral';

                      // Format timestamp nicely
                      let timeStr = item.date;
                      if (item.started_at) {
                        try {
                          const dt = new Date(item.started_at);
                          timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } catch (e) {
                          timeStr = item.started_at.split('T')[1]?.substring(0, 5) || item.date;
                        }
                      }

                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                              <div
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  background: item.is_short ? '#FFE4E6' : '#EFF6FF',
                                  color: item.is_short ? '#E11D48' : '#2563EB',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '13px',
                                  flexShrink: 0,
                                  marginTop: '2px',
                                }}
                              >
                                {item.is_short ? <FiZap /> : <FiPlay />}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    color: 'var(--text-main)',
                                    lineHeight: '1.4',
                                    marginBottom: '4px',
                                  }}
                                >
                                  {item.video_title || 'Untitled YouTube Video'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                    {item.channel_name || 'YouTube Channel'}
                                  </span>
                                  {videoUrl !== '#' && (
                                    <a
                                      href={videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        fontSize: '11px',
                                        color: 'var(--primary-blue)',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontWeight: '600',
                                      }}
                                    >
                                      Watch on YouTube <FiExternalLink />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {item.is_short ? (
                              <span className="badge badge-unproductive" style={{ fontSize: '11px' }}>
                                <FiZap style={{ marginRight: '3px' }} /> Short
                              </span>
                            ) : (
                              <span className="badge badge-productive" style={{ fontSize: '11px' }}>
                                <FiPlayCircle style={{ marginRight: '3px' }} /> Longform
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className={`badge ${badgeClass}`} style={{ fontSize: '11px' }}>
                              {item.video_category || item.category || 'Learning'}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '14px 16px',
                              textAlign: 'right',
                              fontWeight: '800',
                              fontSize: '13px',
                              color: 'var(--text-main)',
                            }}
                          >
                            {secondsToHms(item.watch_duration_seconds)}
                          </td>
                          <td
                            style={{
                              padding: '14px 16px',
                              textAlign: 'right',
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              fontWeight: '600',
                            }}
                          >
                            {timeStr}
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
                  <FiSearch />
                </div>
                <div className="empty-title">No watched videos matching query</div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

