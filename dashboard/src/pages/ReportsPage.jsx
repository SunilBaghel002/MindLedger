import React, { useEffect, useState } from 'react';
import { FiBookOpen, FiCalendar, FiCheckCircle, FiClock, FiDownload, FiFileText, FiMail, FiPieChart, FiSend, FiZap } from 'react-icons/fi';
import StatCard from '../components/StatCard';
import { api } from '../services/api';
import { secondsToHms } from '../utils/formatters';

const REPORT_TYPES = [
  { id: 'daily', label: 'Daily Report', icon: <FiCalendar /> },
  { id: 'weekly', label: 'Weekly Summary', icon: <FiFileText /> },
  { id: 'monthly', label: 'Monthly Digest', icon: <FiPieChart /> },
];

export default function ReportsPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [activeReport, setActiveReport] = useState(null);
  const [historyReports, setHistoryReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [error, setError] = useState(null);

  // Load Report History
  const fetchHistory = () => {
    setLoading(true);
    api
      .getReportHistory()
      .then((data) => {
        setHistoryReports(data?.reports || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load report history');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle Manual Report Generation
  const handleGenerate = (sendEmail = false) => {
    setGenerating(true);
    setActionMessage(null);

    api
      .generateReport(reportType, selectedDate, sendEmail)
      .then((summary) => {
        setActiveReport(summary);
        setGenerating(false);
        setActionMessage({
          type: 'success',
          text: `Successfully generated ${reportType} report for ${selectedDate}!`,
        });
        fetchHistory();
      })
      .catch((err) => {
        setGenerating(false);
        setActionMessage({
          type: 'error',
          text: err.message || 'Failed to generate report',
        });
      });
  };

  // Handle Email Delivery Trigger
  const handleSendEmail = (targetType = reportType, targetDate = selectedDate) => {
    setEmailSending(true);
    setActionMessage(null);

    api
      .sendReportEmail(targetType, targetDate)
      .then((res) => {
        setEmailSending(false);
        setActionMessage({
          type: res.sent ? 'success' : 'error',
          text: res.message || 'Email dispatch completed.',
        });
        fetchHistory();
      })
      .catch((err) => {
        setEmailSending(false);
        setActionMessage({
          type: 'error',
          text: err.message || 'Email dispatch failed.',
        });
      });
  };

  const downloadHtmlUrl = api.getReportDownloadUrl(reportType, selectedDate, 'html');
  const downloadPdfUrl = api.getReportDownloadUrl(reportType, selectedDate, 'pdf');

  return (
    <section className="page-section">
      {/* Hero 2-Column Row: Generator Hub + Quick Exporter */}
      <div className="grid-2">
        {/* Left Column: Report Generator */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <h2 className="card-title">
              <span className="card-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><FiZap style={{ color: 'var(--primary-blue)' }} /></span> Report Generator
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Configure & Compile
            </span>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Select Report Frequency
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {REPORT_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setReportType(t.id)}
                  aria-pressed={reportType === t.id}
                  style={{
                    flex: '1',
                    minWidth: '100px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: reportType === t.id ? 'var(--primary-blue)' : 'var(--bg-page)',
                    color: reportType === t.id ? '#fff' : 'var(--text-secondary)',
                    fontWeight: reportType === t.id ? '600' : '500',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Target Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Target report date"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-main)',
                fontSize: '13px',
                fontWeight: '500',
              }}
            />
          </div>

          <button
            onClick={() => handleGenerate(false)}
            disabled={generating}
            style={{
              width: '100%',
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'var(--primary-blue)',
              color: '#fff',
              fontWeight: '600',
              fontSize: '13px',
              cursor: generating ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <FiSend /> {generating ? 'Compiling Report...' : 'Compile & Preview Report'}
          </button>
        </div>

        {/* Right Column: Instant Exporters */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h2 className="card-title">
                <span className="card-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><FiDownload style={{ color: 'var(--color-productive)' }} /></span> Instant File Exporters
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {reportType.toUpperCase()} ({selectedDate})
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Download pre-formatted HTML or PDF productivity reports directly to your local file system.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <a
                href={downloadHtmlUrl}
                download
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-page)',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-blue)', fontWeight: '700', fontSize: '13px' }}>
                  <FiDownload /> HTML Format
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Interactive web document</span>
              </a>

              <a
                href={downloadPdfUrl}
                download
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-page)',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-productive)', fontWeight: '700', fontSize: '13px' }}>
                  <FiFileText /> PDF Format
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Printable document</span>
              </a>
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
            <button
              onClick={() => handleSendEmail(reportType, selectedDate)}
              disabled={emailSending}
              style={{
                width: '100%',
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--primary-blue)',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary-blue)',
                fontWeight: '600',
                fontSize: '13px',
                cursor: emailSending ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <FiMail /> {emailSending ? 'Dispatching Email...' : 'Dispatch Email to Recipient'}
            </button>
          </div>
        </div>
      </div>

      {/* Action Status Feedback Toast */}
      {actionMessage && (
        <div
          style={{
            marginBottom: 'var(--space-xl)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: actionMessage.type === 'success' ? '#ECFDF5' : '#FFF1F2',
            color: actionMessage.type === 'success' ? '#047857' : '#BE123C',
            border: `1px solid ${actionMessage.type === 'success' ? '#A7F3D0' : '#FECDD3'}`,
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {actionMessage.type === 'success' ? <FiCheckCircle /> : <FiFileText />} {actionMessage.text}
        </div>
      )}

      {/* Active Report Preview Card */}
      {activeReport && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><FiFileText /></span> Active Report Summary ({activeReport.date})
            </h2>
            <span className={`badge badge-${activeReport.productivity_score >= 70 ? 'productive' : 'neutral'}`}>
              Productivity Index: {activeReport.productivity_score}%
            </span>
          </div>

          <div className="grid-3" style={{ marginBottom: '16px' }}>
            <StatCard
              label="Report Period"
              icon={<FiCalendar />}
              value={activeReport.period_label}
              subtext={`Target Date: ${activeReport.date}`}
              isPositive={true}
            />
            <StatCard
              label="Total Screen Time"
              icon={<FiClock />}
              value={secondsToHms(activeReport.total_screen_time_seconds)}
              subtext={`Most used: ${activeReport.most_used_app || 'N/A'}`}
              isPositive={true}
            />
            <StatCard
              label="Delivery Status"
              icon={<FiMail />}
              value={activeReport.email_sent ? 'Email Sent' : 'Ready'}
              subtext={activeReport.email_sent ? 'Dispatched via SMTP' : 'Ready for email dispatch'}
              isPositive={activeReport.email_sent}
            />
          </div>
        </div>
      )}

      {/* Reports History Archive Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="card-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><FiBookOpen /></span> Generated Reports Archive
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {historyReports.length} reports archived
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <div className="skeleton-loader" style={{ width: '50%', margin: '0 auto 12px' }}></div>
            <p style={{ color: 'var(--text-muted)' }}>Loading report history...</p>
          </div>
        ) : historyReports.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Report Period</th>
                <th>Type</th>
                <th>Productivity Score</th>
                <th>Total Screen Time</th>
                <th>Email Status</th>
                <th style={{ textAlign: 'center' }}>Download Actions</th>
              </tr>
            </thead>
            <tbody>
              {historyReports.map((item, idx) => {
                const htmlUrl = api.getReportDownloadUrl(item.report_type, item.date, 'html');
                const pdfUrl = api.getReportDownloadUrl(item.report_type, item.date, 'pdf');
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                      {item.period_label} ({item.date})
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                        {item.report_type}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${item.productivity_score >= 70 ? 'productive' : 'neutral'}`}>
                        {item.productivity_score}%
                      </span>
                    </td>
                    <td style={{ fontWeight: '600' }}>
                      {secondsToHms(item.total_screen_time_seconds)}
                    </td>
                    <td>
                      {item.email_sent ? (
                        <span className="badge badge-productive"><FiCheckCircle /> Sent</span>
                      ) : (
                        <span className="badge badge-neutral">Not Sent</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <a
                          href={htmlUrl}
                          download
                          title="Download HTML"
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--primary-blue)',
                            textDecoration: 'none',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <FiDownload /> HTML
                        </a>
                        <a
                          href={pdfUrl}
                          download
                          title="Download PDF"
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--primary-blue)',
                            textDecoration: 'none',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <FiFileText /> PDF
                        </a>
                        <button
                          onClick={() => handleSendEmail(item.report_type, item.date)}
                          title="Resend Email"
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            borderRadius: 'var(--radius-sm)',
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
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><FiFileText /></div>
            <div className="empty-title">No generated report summaries found</div>
          </div>
        )}
      </div>
    </section>
  );
}
