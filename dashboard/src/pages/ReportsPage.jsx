import React, { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiExternalLink,
  FiEye,
  FiFileText,
  FiFilter,
  FiGlobe,
  FiMail,
  FiPieChart,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiTrendingUp,
  FiX,
  FiZap,
} from 'react-icons/fi';
import StatCard from '../components/StatCard';
import Toast from '../components/Toast';
import { api } from '../services/api';
import { formatHeaderDate, secondsToHms } from '../utils/formatters';

const REPORT_TYPES = [
  { id: 'daily', label: 'Daily Report', subtitle: 'Single Day Focus & Activity Breakdown', icon: <FiCalendar /> },
  { id: 'weekly', label: 'Weekly Summary', subtitle: '7-Day Aggregated Trends & Top Apps', icon: <FiFileText /> },
  { id: 'monthly', label: 'Monthly Digest', subtitle: '30-Day Executive Wellbeing Insights', icon: <FiPieChart /> },
];

export default function ReportsPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [activeReport, setActiveReport] = useState(null);
  const [historyReports, setHistoryReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState([]);

  const addToast = (type, message, title = '') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load Report History & Settings default email
  const fetchHistory = (showToast = false) => {
    setLoading(true);
    Promise.all([api.getReportHistory(), api.getSettings().catch(() => null)])
      .then(([historyData, settingsData]) => {
        setHistoryReports(historyData?.reports || []);
        if (settingsData?.recipient_email && !recipientEmail) {
          setRecipientEmail(settingsData.recipient_email);
        }
        setLoading(false);
        if (showToast) {
          addToast('success', 'Report history archive refreshed successfully.', 'Archive Updated');
        }
      })
      .catch((err) => {
        addToast('error', err.message || 'Failed to load report history archive', 'Sync Error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Quick Date Preset Selectors
  const setQuickDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Handle Manual Report Generation
  const handleGenerate = (sendEmail = false) => {
    setGenerating(true);

    api
      .generateReport(reportType, selectedDate, sendEmail, recipientEmail)
      .then((summary) => {
        setActiveReport(summary);
        setGenerating(false);
        addToast(
          'success',
          `Successfully compiled ${reportType.toUpperCase()} report for ${selectedDate}${
            sendEmail ? ' and queued SMTP delivery!' : '!'
          }`,
          'Report Compiled'
        );
        fetchHistory();
      })
      .catch((err) => {
        setGenerating(false);
        addToast('error', err.message || 'Failed to compile report', 'Generation Error');
      });
  };

  // Handle Email Delivery Trigger
  const handleSendEmail = (targetType = reportType, targetDate = selectedDate, targetRecipient = recipientEmail) => {
    setEmailSending(true);

    api
      .sendReportEmail(targetType, targetDate, targetRecipient)
      .then((res) => {
        setEmailSending(false);
        if (res.sent) {
          addToast(
            'success',
            res.message || `Dispatched ${targetType.toUpperCase()} report email to recipient.`,
            'Email Dispatched'
          );
        } else {
          addToast('warning', res.message || 'Email delivery failed. Check SMTP settings.', 'Dispatch Notice');
        }
        fetchHistory();
      })
      .catch((err) => {
        setEmailSending(false);
        addToast('error', err.message || 'Failed to dispatch email.', 'SMTP Error');
      });
  };

  // Calculate Top KPI Metrics
  const metrics = useMemo(() => {
    const total = historyReports.length;
    if (total === 0) {
      return { total: 0, avgScore: 0, totalSeconds: 0, sentCount: 0, sentRate: 0 };
    }
    const sumScore = historyReports.reduce((acc, r) => acc + (Number(r.productivity_score) || 0), 0);
    const sumSeconds = historyReports.reduce((acc, r) => acc + (Number(r.total_screen_time_seconds) || 0), 0);
    const sentCount = historyReports.filter((r) => r.email_sent).length;

    return {
      total,
      avgScore: (sumScore / total).toFixed(1),
      totalSeconds: sumSeconds,
      sentCount,
      sentRate: Math.round((sentCount / total) * 100),
    };
  }, [historyReports]);

  // Filter & Search Reports
  const filteredReports = useMemo(() => {
    return historyReports.filter((r) => {
      // Type Filter
      if (filterType === 'daily' && r.report_type !== 'daily') return false;
      if (filterType === 'weekly' && r.report_type !== 'weekly') return false;
      if (filterType === 'monthly' && r.report_type !== 'monthly') return false;
      if (filterType === 'sent' && !r.email_sent) return false;
      if (filterType === 'unsent' && r.email_sent) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDate = (r.date || '').toLowerCase().includes(q);
        const matchesLabel = (r.period_label || '').toLowerCase().includes(q);
        const matchesType = (r.report_type || '').toLowerCase().includes(q);
        return matchesDate || matchesLabel || matchesType;
      }
      return true;
    });
  }, [historyReports, filterType, searchQuery]);

  const downloadHtmlUrl = api.getReportDownloadUrl(reportType, selectedDate, 'html');
  const downloadPdfUrl = api.getReportDownloadUrl(reportType, selectedDate, 'pdf');

  return (
    <section className="page-section">
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* ───────── Top Navigation & Controls Header ───────── */}
      <div className="top-header" style={{ borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiBookOpen style={{ color: 'var(--primary-blue)' }} /> Analytics & Executive Reports
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Compile, preview, download, and dispatch productivity and digital wellbeing digests.
          </p>
        </div>

        <div className="header-controls">
          <div className="header-pill">
            <FiCalendar style={{ color: 'var(--primary-blue)' }} />
            <span>{formatHeaderDate()}</span>
          </div>

          <button
            onClick={() => fetchHistory(true)}
            disabled={loading}
            className="btn-header-refresh"
            title="Refresh reports history"
          >
            <FiRefreshCw style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>{loading ? 'Refreshing...' : 'Refresh Archive'}</span>
          </button>
        </div>
      </div>

      {/* ───────── KPI Stat Cards (4 Columns) ───────── */}
      <div className="grid-4">
        <StatCard
          label="Archived Reports"
          icon={<FiBookOpen />}
          value={`${metrics.total} Compiled`}
          subtext="Daily, Weekly & Monthly"
          accentColor="blue"
          badgeText="Archive"
          isPositive={true}
        />
        <StatCard
          label="Avg Productivity Index"
          icon={<FiTrendingUp />}
          value={`${metrics.avgScore}%`}
          subtext="Cross-report performance"
          accentColor="emerald"
          badgeText={metrics.avgScore >= 70 ? 'High Focus' : 'Moderate'}
          isPositive={metrics.avgScore >= 70}
        />
        <StatCard
          label="Tracked Screen Time"
          icon={<FiClock />}
          value={secondsToHms(metrics.totalSeconds)}
          subtext="Total aggregated duration"
          accentColor="purple"
          badgeText="Active Focus"
          isPositive={true}
        />
        <StatCard
          label="SMTP Email Dispatch"
          icon={<FiMail />}
          value={`${metrics.sentCount} / ${metrics.total}`}
          subtext={`${metrics.sentRate}% delivery rate`}
          accentColor="cyan"
          badgeText={metrics.sentCount > 0 ? 'Active' : 'Standby'}
          isPositive={metrics.sentCount > 0}
        />
      </div>

      {/* ───────── 2-Column Row: Report Studio & Exporters ───────── */}
      <div className="grid-2">
        {/* Left Column: Report Generator Studio */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '18px' }}>
              <h2 className="card-title">
                <span className="card-icon" style={{ color: 'var(--primary-blue)' }}>
                  <FiZap />
                </span>
                Report Compiler Studio
              </h2>
              <span className="badge badge-neutral" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                On-Demand Engine
              </span>
            </div>

            {/* Frequency Selection Pills */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                1. Select Frequency Cadence
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {REPORT_TYPES.map((t) => {
                  const isActive = reportType === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setReportType(t.id)}
                      aria-pressed={isActive}
                      style={{
                        padding: '12px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1.5px solid ${isActive ? 'var(--primary-600)' : 'var(--border-color)'}`,
                        backgroundColor: isActive ? 'var(--primary-50)' : 'var(--bg-surface)',
                        color: isActive ? 'var(--primary-700)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.12)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '18px', color: isActive ? 'var(--primary-600)' : 'var(--text-muted)' }}>
                        {t.icon}
                      </span>
                      <span style={{ fontSize: '12.5px', fontWeight: isActive ? '700' : '600' }}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Date & Quick Presets */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  2. Select Target Date
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setQuickDate(0)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: selectedDate === todayStr ? 'var(--primary-100)' : 'var(--bg-subtle)',
                      color: selectedDate === todayStr ? 'var(--primary-700)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setQuickDate(1)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Yesterday
                  </button>
                  <button
                    onClick={() => setQuickDate(7)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    -7 Days
                  </button>
                </div>
              </div>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Target report date"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-main)',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  outline: 'none',
                }}
              />
            </div>

            {/* Recipient Email Config */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                3. Recipient Email Address (Optional Override)
              </label>
              <div style={{ position: 'relative' }}>
                <FiMail
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="email"
                  placeholder="e.g. user@domain.com (defaults to Settings SMTP recipient)"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-page)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Compile Action Buttons Row */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={() => handleGenerate(false)}
              disabled={generating || emailSending}
              style={{
                flex: '1.4',
                padding: '12px 18px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#fff',
                fontWeight: '700',
                fontSize: '13.5px',
                cursor: generating ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!generating) e.currentTarget.style.filter = 'brightness(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              <FiZap style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }} />
              {generating ? 'Compiling Analytics...' : 'Compile & Preview Report'}
            </button>

            <button
              onClick={() => handleGenerate(true)}
              disabled={generating || emailSending}
              title="Compile and dispatch email immediately"
              style={{
                flex: '1',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--primary-600)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-700)',
                fontWeight: '700',
                fontSize: '13px',
                cursor: generating ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary-100)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary-50)';
              }}
            >
              <FiSend />
              <span>Direct Email</span>
            </button>
          </div>
        </div>

        {/* Right Column: Instant File Exporters & Download Hub */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '18px' }}>
              <h2 className="card-title">
                <span className="card-icon" style={{ color: 'var(--color-productive)' }}>
                  <FiDownload />
                </span>
                Instant File Exporters
              </h2>
              <span className="badge badge-productive" style={{ fontSize: '11px', fontWeight: '700' }}>
                {reportType.toUpperCase()} • {selectedDate}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.5 }}>
              Export clean standalone documents directly to your local file system or trigger immediate email dispatch.
            </p>

            {/* Interactive Exporter Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              {/* HTML Export Card */}
              <a
                href={downloadHtmlUrl}
                download
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid #BAE6FD',
                  background: 'linear-gradient(145deg, #F0F9FF 0%, #FFFFFF 100%)',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(14, 165, 233, 0.08)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(14, 165, 233, 0.16)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(14, 165, 233, 0.08)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284C7', fontWeight: '800', fontSize: '14px' }}>
                    <FiGlobe style={{ fontSize: '16px' }} /> HTML Document
                  </div>
                  <span style={{ fontSize: '11px', color: '#0284C7', background: 'rgba(14, 165, 233, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                    .HTML
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  Self-contained responsive web report with interactive data tables.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#0284C7', marginTop: '4px' }}>
                  <FiDownload /> Download Web File
                </div>
              </a>

              {/* PDF Export Card */}
              <a
                href={downloadPdfUrl}
                download
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid #A7F3D0',
                  background: 'linear-gradient(145deg, #ECFDF5 0%, #FFFFFF 100%)',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 185, 129, 0.16)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(16, 185, 129, 0.08)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: '800', fontSize: '14px' }}>
                    <FiPrinter style={{ fontSize: '16px' }} /> Printable PDF
                  </div>
                  <span style={{ fontSize: '11px', color: '#059669', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                    .PDF
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  Executive printable layout formatted for paper export and archiving.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#059669', marginTop: '4px' }}>
                  <FiDownload /> Download Printable
                </div>
              </a>
            </div>
          </div>

          {/* Quick Email Dispatcher Bottom Bar */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Target: <strong style={{ color: 'var(--text-main)' }}>{recipientEmail || 'Default Settings Recipient'}</strong>
            </div>

            <button
              onClick={() => handleSendEmail(reportType, selectedDate, recipientEmail)}
              disabled={emailSending}
              style={{
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid #CBD5E1',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: emailSending ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E2E8F0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
              }}
            >
              <FiMail style={{ color: 'var(--primary-blue)' }} />
              {emailSending ? 'Dispatching...' : 'Dispatch Email Now'}
            </button>
          </div>
        </div>
      </div>

      {/* ───────── Active Report Live Preview Modal / Card ───────── */}
      {activeReport && (
        <div
          className="card"
          style={{
            marginBottom: 'var(--space-xl)',
            border: '1.5px solid #BFDBFE',
            background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
            boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.1)',
          }}
        >
          <div className="card-header" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--primary-50)',
                  color: 'var(--primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                <FiFileText />
              </div>
              <div>
                <h2 className="card-title" style={{ margin: 0, fontSize: '16px' }}>
                  Active Report Preview: {activeReport.period_label || `${activeReport.report_type?.toUpperCase()} Summary`}
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Target Period End: {activeReport.date}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className={`badge badge-${
                  (Number(activeReport.productivity_score) || 0) >= 70 ? 'productive' : 'neutral'
                }`}
                style={{ fontSize: '12.5px', padding: '6px 12px', fontWeight: '800' }}
              >
                Productivity Index: {activeReport.productivity_score}%
              </span>

              <button
                onClick={() => setActiveReport(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Dismiss preview"
              >
                <FiX />
              </button>
            </div>
          </div>

          <div className="grid-3" style={{ margin: '18px 0 14px 0' }}>
            <StatCard
              label="Report Period"
              icon={<FiCalendar />}
              value={activeReport.period_label || `${activeReport.report_type} (${activeReport.date})`}
              subtext={`Type: ${activeReport.report_type?.toUpperCase() || 'DAILY'}`}
              accentColor="blue"
              isPositive={true}
            />
            <StatCard
              label="Total Screen Time"
              icon={<FiClock />}
              value={secondsToHms(activeReport.total_screen_time_seconds)}
              subtext={`Top App: ${activeReport.most_used_app || 'Active Workspace'}`}
              accentColor="purple"
              isPositive={true}
            />
            <StatCard
              label="Email Status"
              icon={<FiMail />}
              value={activeReport.email_sent ? 'Dispatched' : 'Ready'}
              subtext={activeReport.email_sent ? 'Delivered via SMTP' : 'Ready for dispatch'}
              accentColor={activeReport.email_sent ? 'emerald' : 'cyan'}
              badgeText={activeReport.email_sent ? 'Sent' : 'Ready'}
              isPositive={activeReport.email_sent}
            />
          </div>

          {/* Action Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Summary compiled in MindLedger SQLite local database.
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={api.getReportDownloadUrl(activeReport.report_type, activeReport.date, 'html')}
                download
                className="btn-header-refresh"
                style={{ textDecoration: 'none' }}
              >
                <FiDownload /> Download HTML
              </a>
              <a
                href={api.getReportDownloadUrl(activeReport.report_type, activeReport.date, 'pdf')}
                download
                className="btn-header-refresh"
                style={{ textDecoration: 'none', color: 'var(--color-productive)' }}
              >
                <FiPrinter /> Download PDF
              </a>
              <button
                onClick={() => handleSendEmail(activeReport.report_type, activeReport.date, recipientEmail)}
                className="btn-header-refresh"
                style={{ color: 'var(--primary-600)' }}
              >
                <FiSend /> Send via Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────── Generated Reports Archive Table ───────── */}
      <div className="card">
        <div
          className="card-header"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              <span className="card-icon" style={{ color: 'var(--primary-blue)' }}>
                <FiBookOpen />
              </span>
              Generated Reports Archive
            </h2>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              {historyReports.length} records
            </span>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <FiSearch
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              />
              <input
                type="text"
                placeholder="Search archive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 12px 6px 28px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-main)',
                  fontSize: '12.5px',
                  outline: 'none',
                  width: '160px',
                }}
              />
            </div>

            {/* Filter Pills */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--bg-subtle)',
                padding: '3px',
                borderRadius: 'var(--radius-sm)',
                gap: '2px',
              }}
            >
              {[
                { id: 'all', label: 'All' },
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'sent', label: 'Sent' },
              ].map((f) => {
                const isSelected = filterType === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11.5px',
                      fontWeight: isSelected ? '700' : '500',
                      borderRadius: '4px',
                      border: 'none',
                      background: isSelected ? 'var(--bg-surface)' : 'transparent',
                      color: isSelected ? 'var(--primary-600)' : 'var(--text-secondary)',
                      boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div className="skeleton-loader" style={{ width: '40%', height: '14px', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading reports archive...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Report Period & Date</th>
                  <th style={{ width: '12%' }}>Type</th>
                  <th style={{ width: '18%' }}>Productivity Score</th>
                  <th style={{ width: '16%' }}>Screen Time</th>
                  <th style={{ width: '12%' }}>Email Status</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((item, idx) => {
                  const htmlUrl = api.getReportDownloadUrl(item.report_type, item.date, 'html');
                  const pdfUrl = api.getReportDownloadUrl(item.report_type, item.date, 'pdf');
                  const score = Number(item.productivity_score) || 0;
                  const isGoodScore = score >= 70;
                  const isModerate = score >= 50 && score < 70;

                  return (
                    <tr key={idx} style={{ transition: 'background-color 0.15s ease' }}>
                      {/* Period & Date */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: 'var(--bg-subtle)',
                              color: 'var(--primary-blue)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                            }}
                          >
                            <FiCalendar />
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>
                              {item.period_label || `Summary for ${item.date}`}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              Target Date: {item.date}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            textTransform: 'capitalize',
                            backgroundColor:
                              item.report_type === 'weekly'
                                ? 'rgba(139, 92, 246, 0.12)'
                                : item.report_type === 'monthly'
                                ? 'rgba(245, 158, 11, 0.12)'
                                : 'rgba(37, 99, 235, 0.1)',
                            color:
                              item.report_type === 'weekly'
                                ? '#7C3AED'
                                : item.report_type === 'monthly'
                                ? '#D97706'
                                : '#2563EB',
                          }}
                        >
                          {item.report_type}
                        </span>
                      </td>

                      {/* Productivity Score Bar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            className={`badge badge-${isGoodScore ? 'productive' : isModerate ? 'learning' : 'neutral'}`}
                            style={{ fontWeight: '800', minWidth: '46px', textAlign: 'center' }}
                          >
                            {score}%
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: '5px',
                              background: 'var(--border-subtle)',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              maxWidth: '60px',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(score, 100)}%`,
                                height: '100%',
                                background: isGoodScore
                                  ? 'var(--color-productive)'
                                  : isModerate
                                  ? 'var(--primary-blue)'
                                  : 'var(--color-neutral)',
                                borderRadius: '4px',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Screen Time */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>
                          <FiClock style={{ color: 'var(--text-muted)', fontSize: '12px' }} />
                          <span>{secondsToHms(item.total_screen_time_seconds)}</span>
                        </div>
                      </td>

                      {/* Email Status */}
                      <td>
                        {item.email_sent ? (
                          <span className="badge badge-productive" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <FiCheckCircle style={{ fontSize: '12px' }} /> Sent
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ color: 'var(--text-muted)' }}>
                            Not Dispatched
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setActiveReport(item);
                              window.scrollTo({ top: 120, behavior: 'smooth' });
                            }}
                            title="Preview Report Details"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--primary-blue)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontWeight: '600',
                            }}
                          >
                            <FiEye /> View
                          </button>

                          <a
                            href={htmlUrl}
                            download
                            title="Download HTML Document"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--text-secondary)',
                              textDecoration: 'none',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <FiDownload /> HTML
                          </a>

                          <a
                            href={pdfUrl}
                            download
                            title="Download Printable PDF"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--color-productive)',
                              textDecoration: 'none',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <FiPrinter /> PDF
                          </a>

                          <button
                            onClick={() => handleSendEmail(item.report_type, item.date, recipientEmail)}
                            title="Re-dispatch Email to Recipient"
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <FiMail />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div className="empty-icon" style={{ fontSize: '32px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <FiFileText />
            </div>
            <div className="empty-title" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
              No reports match your current filter
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Select a different filter criteria or compile a new report above.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
