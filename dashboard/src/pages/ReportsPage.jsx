import React, { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import { api } from '../services/api';
import { secondsToHms } from '../utils/formatters';

const REPORT_TYPES = [
  { id: 'daily', label: 'Daily Report', icon: '📅' },
  { id: 'weekly', label: 'Weekly Summary', icon: '🗓️' },
  { id: 'monthly', label: 'Monthly Digest', icon: '📊' },
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
      {/* Controls Bar: Type Tabs + Date Picker + Action Buttons */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <h2 className="card-title">
            <span className="card-icon">⚡</span> Report Generator & Exporter
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Pipeline Orchestration
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
          }}
        >
          {/* Report Type Tabs */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            {REPORT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setReportType(t.id)}
                aria-pressed={reportType === t.id}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: reportType === t.id ? 'var(--primary-blue)' : 'var(--bg-page)',
                  color: reportType === t.id ? '#fff' : 'var(--text-secondary)',
                  fontWeight: reportType === t.id ? '600' : '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Date Selector & Triggers */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Target report date"
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-main)',
                fontSize: '13px',
                fontWeight: '500',
              }}
            />

            <button
              onClick={() => handleGenerate(false)}
              disabled={generating}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'var(--primary-blue)',
                color: '#fff',
                fontWeight: '600',
                fontSize: '13px',
                cursor: generating ? 'wait' : 'pointer',
              }}
            >
              {generating ? 'Processing...' : '🚀 Generate Report'}
            </button>
          </div>
        </div>

        {/* Action Status Feedback Toast */}
        {actionMessage && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: actionMessage.type === 'success' ? 'rgba(72, 187, 120, 0.12)' : 'rgba(252, 129, 129, 0.12)',
              color: actionMessage.type === 'success' ? '#276749' : '#9B2C2C',
              border: `1px solid ${actionMessage.type === 'success' ? '#9AE6B4' : '#FEB2B2'}`,
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            {actionMessage.text}
          </div>
        )}
      </div>

      {/* Active Report Preview Card */}
      {activeReport && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">📋</span> Active Report Preview
            </h2>
            <span className={`badge badge-${activeReport.productivity_score >= 70 ? 'productive' : 'neutral'}`}>
              Score: {activeReport.productivity_score}%
            </span>
          </div>

          <div className="grid-3" style={{ marginBottom: '16px' }}>
            <StatCard
              label="Report Period"
              icon="🗓️"
              value={activeReport.period_label}
              subtext={`Target Date: ${activeReport.date}`}
              isPositive={true}
            />
            <StatCard
              label="Screen Time"
              icon="⏱️"
              value={secondsToHms(activeReport.total_screen_time_seconds)}
              subtext={`Most used: ${activeReport.most_used_app || 'N/A'}`}
              isPositive={true}
            />
            <StatCard
              label="Delivery Status"
              icon="✉️"
              value={activeReport.email_sent ? 'Email Sent' : 'Not Emailed'}
              subtext={activeReport.email_sent ? 'Dispatched via SMTP' : 'Ready for email'}
              isPositive={activeReport.email_sent}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <a
              href={downloadHtmlUrl}
              download
              className="btn"
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-page)',
                border: '1px solid var(--border-color)',
                color: 'var(--primary-blue)',
                fontWeight: '600',
                textDecoration: 'none',
                fontSize: '13px',
              }}
            >
              📥 Download HTML Report
            </a>

            <a
              href={downloadPdfUrl}
              download
              className="btn"
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-page)',
                border: '1px solid var(--border-color)',
                color: 'var(--primary-blue)',
                fontWeight: '600',
                textDecoration: 'none',
                fontSize: '13px',
              }}
            >
              📄 Download PDF Report
            </a>

            <button
              onClick={() => handleSendEmail(reportType, selectedDate)}
              disabled={emailSending}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary-blue)',
                border: 'none',
                color: '#fff',
                fontWeight: '600',
                fontSize: '13px',
                cursor: emailSending ? 'wait' : 'pointer',
              }}
            >
              {emailSending ? 'Sending...' : '✉️ Send Email Report'}
            </button>
          </div>
        </div>
      )}

      {/* Reports History Archive Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="card-icon">📚</span> Generated Reports Archive
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {historyReports.length} reports saved
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
                <th>Score</th>
                <th>Screen Time</th>
                <th>Email Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {historyReports.map((item, idx) => {
                const htmlUrl = api.getReportDownloadUrl(item.report_type, item.date, 'html');
                const pdfUrl = api.getReportDownloadUrl(item.report_type, item.date, 'pdf');
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                      {item.period_label}
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
                        <span className="badge badge-productive">✓ Sent</span>
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
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--primary-blue)',
                            textDecoration: 'none',
                          }}
                        >
                          HTML
                        </a>
                        <a
                          href={pdfUrl}
                          download
                          title="Download PDF"
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--primary-blue)',
                            textDecoration: 'none',
                          }}
                        >
                          PDF
                        </a>
                        <button
                          onClick={() => handleSendEmail(item.report_type, item.date)}
                          title="Resend Email"
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          ✉️
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
            <div className="empty-icon">📊</div>
            <div className="empty-title">No generated report summaries found</div>
          </div>
        )}
      </div>
    </section>
  );
}
