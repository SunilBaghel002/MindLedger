import React, { useEffect, useState } from 'react';
import { FiCheckCircle, FiDatabase, FiDownload, FiLock, FiMail, FiPauseCircle, FiPlus, FiSave, FiSend, FiShield, FiSliders, FiTag, FiTrash2 } from 'react-icons/fi';
import { api } from '../services/api';

const TABS = [
  { id: 'general', label: 'General & Tracking', icon: <FiSliders /> },
  { id: 'email', label: 'Email & SMTP', icon: <FiMail /> },
  { id: 'rules', label: 'Category Rules', icon: <FiTag /> },
  { id: 'data', label: 'Data & Privacy', icon: <FiLock /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [settingsData, setSettingsData] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    recipient_email: '',
    tracking_enabled: true,
    idle_threshold_seconds: 300,
    theme: 'light',
  });
  const [categoryRules, setCategoryRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // New Category Rule Form State
  const [newRule, setNewRule] = useState({
    rule_type: 'app',
    pattern: '',
    category: '',
    productivity: 'productive',
    priority: 10,
  });

  // Load Settings and Category Rules
  const loadData = () => {
    setLoading(true);
    Promise.all([api.getSettings(), api.getCategoryRules()])
      .then(([sData, rData]) => {
        if (sData) setSettingsData((prev) => ({ ...prev, ...sData }));
        if (rData) setCategoryRules(rData || []);
        setLoading(false);
      })
      .catch((err) => {
        setActionMessage({ type: 'error', text: err.message || 'Failed to load settings' });
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Settings Changes
  const handleSaveSettings = (updates = settingsData) => {
    setSaving(true);
    setActionMessage(null);
    api
      .updateSettings(updates)
      .then((data) => {
        setSaving(false);
        setSettingsData((prev) => ({ ...prev, ...data }));
        setActionMessage({ type: 'success', text: 'Settings updated successfully!' });
      })
      .catch((err) => {
        setSaving(false);
        setActionMessage({ type: 'error', text: err.message || 'Failed to save settings' });
      });
  };

  // Dispatch Test Email
  const handleTestEmail = () => {
    setTestingEmail(true);
    setActionMessage(null);
    api
      .testEmail(settingsData.recipient_email)
      .then((res) => {
        setTestingEmail(false);
        setActionMessage({
          type: res.sent ? 'success' : 'error',
          text: res.message || 'Test email action completed.',
        });
      })
      .catch((err) => {
        setTestingEmail(false);
        setActionMessage({ type: 'error', text: err.message || 'Test email failed.' });
      });
  };

  // Create Category Rule
  const handleAddRule = (e) => {
    e.preventDefault();
    if (!newRule.pattern.trim() || !newRule.category.trim()) {
      setActionMessage({ type: 'error', text: 'Pattern and Category name are required.' });
      return;
    }

    api
      .createCategoryRule(newRule)
      .then(() => {
        setNewRule({ rule_type: 'app', pattern: '', category: '', productivity: 'productive', priority: 10 });
        setActionMessage({ type: 'success', text: 'Category rule created successfully!' });
        loadData();
      })
      .catch((err) => {
        setActionMessage({ type: 'error', text: err.message || 'Failed to add category rule' });
      });
  };

  // Delete Category Rule
  const handleDeleteRule = (ruleId) => {
    api
      .deleteCategoryRule(ruleId)
      .then(() => {
        setActionMessage({ type: 'success', text: 'Rule deleted successfully!' });
        loadData();
      })
      .catch((err) => {
        setActionMessage({ type: 'error', text: err.message || 'Failed to delete rule' });
      });
  };

  // Clear Tracking History
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all tracking history? This action cannot be undone.')) {
      api
        .clearHistory()
        .then((res) => {
          setActionMessage({ type: 'success', text: res.message || 'Tracking history cleared.' });
        })
        .catch((err) => {
          setActionMessage({ type: 'error', text: err.message || 'Failed to clear history' });
        });
    }
  };

  const exportUrl = api.getExportDataUrl('json');

  return (
    <section className="page-section">
      {/* Header Tabs */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <h2 className="card-title">
            <span className="card-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><FiSliders style={{ color: 'var(--primary-blue)' }} /></span> MindLedger System Preferences
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            System Configuration & Automation
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              aria-pressed={activeTab === t.id}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: activeTab === t.id ? 'var(--primary-blue)' : 'var(--bg-page)',
                color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
                fontWeight: activeTab === t.id ? '600' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === t.id ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Action Status Feedback Toast */}
        {actionMessage && (
          <div
            style={{
              marginTop: '16px',
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
            {actionMessage.type === 'success' ? <FiCheckCircle /> : <FiShield />} {actionMessage.text}
          </div>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="skeleton-loader" style={{ width: '60%', margin: '0 auto 12px' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading preferences...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: General & Tracking */}
          {activeTab === 'general' && (
            <div className="card">
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiSliders /> Tracking & Idle Threshold Controls
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)' }}>
                      Real-Time System Tracking
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Pause or resume window activity and app tracking.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const updated = !settingsData.tracking_enabled;
                      setSettingsData((p) => ({ ...p, tracking_enabled: updated }));
                      handleSaveSettings({ tracking_enabled: updated });
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      backgroundColor: settingsData.tracking_enabled ? 'var(--color-productive)' : 'var(--text-muted)',
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {settingsData.tracking_enabled ? <><FiCheckCircle /> Tracking Active</> : <><FiPauseCircle /> Tracking Paused</>}
                  </button>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />

                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px', color: 'var(--text-main)' }}>
                    Idle Timeout Threshold (Seconds)
                  </label>
                  <input
                    type="number"
                    value={settingsData.idle_threshold_seconds}
                    onChange={(e) => setSettingsData((p) => ({ ...p, idle_threshold_seconds: parseInt(e.target.value) || 300 }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-page)',
                      fontSize: '13px',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    User inactivity threshold before triggering idle state (default: 300s / 5 mins).
                  </span>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <button
                    onClick={() => handleSaveSettings()}
                    disabled={saving}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      backgroundColor: 'var(--primary-blue)',
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: saving ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <FiSave /> {saving ? 'Saving...' : 'Save General Preferences'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Email & SMTP Settings */}
          {activeTab === 'email' && (
            <div className="card">
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiMail /> SMTP Email Server Configuration
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '640px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '12px', marginBottom: '4px', color: 'var(--text-main)' }}>
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com"
                    value={settingsData.smtp_host}
                    onChange={(e) => setSettingsData((p) => ({ ...p, smtp_host: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '12px', marginBottom: '4px', color: 'var(--text-main)' }}>
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    placeholder="587"
                    value={settingsData.smtp_port}
                    onChange={(e) => setSettingsData((p) => ({ ...p, smtp_port: parseInt(e.target.value) || 587 }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '12px', marginBottom: '4px', color: 'var(--text-main)' }}>
                    SMTP Username / Email
                  </label>
                  <input
                    type="text"
                    placeholder="your-email@gmail.com"
                    value={settingsData.smtp_username}
                    onChange={(e) => setSettingsData((p) => ({ ...p, smtp_username: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '12px', marginBottom: '4px', color: 'var(--text-main)' }}>
                    SMTP App Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={settingsData.smtp_password || ''}
                    onChange={(e) => setSettingsData((p) => ({ ...p, smtp_password: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '12px', marginBottom: '4px', color: 'var(--text-main)' }}>
                    Report Recipient Email
                  </label>
                  <input
                    type="email"
                    placeholder="recipient@example.com"
                    value={settingsData.recipient_email}
                    onChange={(e) => setSettingsData((p) => ({ ...p, recipient_email: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => handleSaveSettings()}
                  disabled={saving}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: 'var(--primary-blue)',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: saving ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FiSave /> {saving ? 'Saving...' : 'Save Email Credentials'}
                </button>

                <button
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-page)',
                    color: 'var(--primary-blue)',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: testingEmail ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FiSend /> {testingEmail ? 'Testing...' : 'Dispatch Test Email'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Category Rules Manager */}
          {activeTab === 'rules' && (
            <div className="card">
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiTag /> Custom Category & Productivity Classification Rules
              </h3>

              {/* Add New Rule Form */}
              <form onSubmit={handleAddRule} style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '12px', color: 'var(--text-main)' }}>
                  Add Custom Category Rule
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Rule Type</label>
                    <select
                      value={newRule.rule_type}
                      onChange={(e) => setNewRule((p) => ({ ...p, rule_type: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    >
                      <option value="app">App Name</option>
                      <option value="domain">Domain Name</option>
                      <option value="url_pattern">URL Keyword</option>
                      <option value="youtube_channel">YouTube Channel</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Pattern / Keyword</label>
                    <input
                      type="text"
                      placeholder="e.g. github, vscode"
                      value={newRule.pattern}
                      onChange={(e) => setNewRule((p) => ({ ...p, pattern: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Category Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Coding, Music"
                      value={newRule.category}
                      onChange={(e) => setNewRule((p) => ({ ...p, category: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Productivity</label>
                    <select
                      value={newRule.productivity}
                      onChange={(e) => setNewRule((p) => ({ ...p, productivity: e.target.value }))}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    >
                      <option value="productive">Productive</option>
                      <option value="learning">Learning</option>
                      <option value="neutral">Neutral</option>
                      <option value="unproductive">Unproductive</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    style={{
                      padding: '7px 14px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: 'var(--primary-blue)',
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <FiPlus /> Add Rule
                  </button>
                </div>
              </form>

              {/* Rules List Table */}
              {categoryRules.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Priority</th>
                      <th>Rule Type</th>
                      <th>Pattern</th>
                      <th>Assigned Category</th>
                      <th>Productivity</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRules.map((rule) => (
                      <tr key={rule.id}>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>#{rule.priority}</td>
                        <td>
                          <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                            {rule.rule_type}
                          </span>
                        </td>
                        <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{rule.pattern}</td>
                        <td style={{ fontWeight: '500' }}>{rule.category}</td>
                        <td>
                          <span className={`badge badge-${rule.productivity || 'neutral'}`}>
                            {rule.productivity}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--color-unproductive)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon"><FiTag /></div>
                  <div className="empty-title">No custom classification rules defined</div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Data Management & Privacy */}
          {activeTab === 'data' && (
            <div className="card">
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiLock /> Data Management, Backup & Privacy
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '540px' }}>
                <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-page)' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiDownload /> Export Complete Activity Data (JSON)
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Download all local application tracking sessions, browser domain logs, and YouTube history records.
                  </p>
                  <a
                    href={exportUrl}
                    download
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--primary-blue)',
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: '13px',
                      textDecoration: 'none',
                    }}
                  >
                    <FiDownload /> Download Activity JSON
                  </a>
                </div>

                <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-page)' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', color: 'var(--color-unproductive)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiTrash2 /> Clear Tracking History
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Purge app sessions, web tracking logs, YouTube watch history, and summary reports from the SQLite database.
                  </p>
                  <button
                    onClick={handleClearHistory}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-unproductive)',
                      backgroundColor: 'rgba(252, 129, 129, 0.1)',
                      color: 'var(--color-unproductive)',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <FiTrash2 /> Clear All Tracking History
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
