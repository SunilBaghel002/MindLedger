import React, { useEffect, useState } from 'react';
import {
  FiActivity,
  FiCheckCircle,
  FiDatabase,
  FiDownload,
  FiHeadphones,
  FiLayers,
  FiLock,
  FiMail,
  FiMonitor,
  FiMusic,
  FiPauseCircle,
  FiPlus,
  FiSave,
  FiSend,
  FiShield,
  FiSliders,
  FiTag,
  FiTrash2,
  FiZap,
} from 'react-icons/fi';
import { api } from '../services/api';

const TABS = [
  { id: 'general', label: 'General & Tracking', icon: <FiSliders /> },
  { id: 'tracking_mode', label: 'Screen Time Modes', icon: <FiMonitor /> },
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
    tracking_mode: 'ignore_background',
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

          {/* TAB 2: Screen Time Modes */}
          {activeTab === 'tracking_mode' && (
            <div className="card" style={{ maxWidth: '820px' }}>
              <div style={{ marginBottom: '22px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <FiMonitor style={{ color: '#3B82F6' }} /> Screen Time & Background Activity Modes
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Choose how MindLedger treats background music (YouTube / YouTube Music / Spotify) and multi-tasking windows when computing your active screen time and productivity score.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                {/* Mode 1: Ignore Background Tasks & Media (Recommended) */}
                <div
                  onClick={() => {
                    const updated = 'ignore_background';
                    setSettingsData((p) => ({ ...p, tracking_mode: updated }));
                    handleSaveSettings({ ...settingsData, tracking_mode: updated });
                  }}
                  style={{
                    border: settingsData.tracking_mode === 'ignore_background' ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                    backgroundColor: settingsData.tracking_mode === 'ignore_background' ? '#EFF6FF' : '#FFFFFF',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    boxShadow: settingsData.tracking_mode === 'ignore_background' ? '0 4px 14px rgba(59, 130, 246, 0.12)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: settingsData.tracking_mode === 'ignore_background' ? '6px solid #3B82F6' : '2px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      flexShrink: 0,
                      marginTop: '2px',
                      transition: 'all 0.2s ease',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiMusic style={{ color: '#10B981', fontSize: '17px' }} /> Ignore Background Tasks & Media
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
                        ★ Recommended for Music & Coding
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                      When you play YouTube songs, study playlists, or videos in the background while coding in <strong>Antigravity IDE</strong> or browsing other tabs, background media is recognized as background audio and <strong>will NOT</strong> overwrite or inflate your active screen time. Your current active foreground task gets 100% credit for your productive work time.
                    </p>
                  </div>
                </div>

                {/* Mode 2: Record Background & Current Screen */}
                <div
                  onClick={() => {
                    const updated = 'record_both';
                    setSettingsData((p) => ({ ...p, tracking_mode: updated }));
                    handleSaveSettings({ ...settingsData, tracking_mode: updated });
                  }}
                  style={{
                    border: settingsData.tracking_mode === 'record_both' ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                    backgroundColor: settingsData.tracking_mode === 'record_both' ? '#EFF6FF' : '#FFFFFF',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    boxShadow: settingsData.tracking_mode === 'record_both' ? '0 4px 14px rgba(59, 130, 246, 0.12)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: settingsData.tracking_mode === 'record_both' ? '6px solid #3B82F6' : '2px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      flexShrink: 0,
                      marginTop: '2px',
                      transition: 'all 0.2s ease',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiLayers style={{ color: '#3B82F6', fontSize: '17px' }} /> Record Background & Current Screen Together
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                        Dual Multi-Tasking
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                      Simultaneously records both active foreground applications and background YouTube media sessions. Total screen time includes both your active window and the full duration of background media playback.
                    </p>
                  </div>
                </div>

                {/* Mode 3: Record Current Screen Task Only */}
                <div
                  onClick={() => {
                    const updated = 'foreground_only';
                    setSettingsData((p) => ({ ...p, tracking_mode: updated }));
                    handleSaveSettings({ ...settingsData, tracking_mode: updated });
                  }}
                  style={{
                    border: settingsData.tracking_mode === 'foreground_only' ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                    backgroundColor: settingsData.tracking_mode === 'foreground_only' ? '#EFF6FF' : '#FFFFFF',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    boxShadow: settingsData.tracking_mode === 'foreground_only' ? '0 4px 14px rgba(59, 130, 246, 0.12)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: settingsData.tracking_mode === 'foreground_only' ? '6px solid #3B82F6' : '2px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      flexShrink: 0,
                      marginTop: '2px',
                      transition: 'all 0.2s ease',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiMonitor style={{ color: '#8B5CF6', fontSize: '17px' }} /> Record Current Screen Task Only
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
                        Strict Single-Focus
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                      Strict single-window mode. Only tracks the specific application window currently focused and receiving keyboard/mouse input. Completely ignores background browser media and hidden tabs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Status Callout */}
              <div style={{ padding: '14px 18px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiCheckCircle style={{ color: '#10B981', fontSize: '16px' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Active Mode: <strong>{settingsData.tracking_mode === 'ignore_background' ? 'Ignore Background Tasks & Media' : settingsData.tracking_mode === 'record_both' ? 'Record Both Together' : 'Record Current Task Only'}</strong>
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Changes apply immediately</span>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', width: '100%' }}>
                <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-page)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '6px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiDownload style={{ color: 'var(--primary-blue)' }} /> Export Complete Activity Data (JSON)
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                      Download all local application tracking sessions, browser domain logs, and YouTube watch history records in structured JSON format.
                    </p>
                  </div>
                  <a
                    href={exportUrl}
                    download
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--primary-blue)',
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: '13px',
                      textDecoration: 'none',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <FiDownload /> Download Activity JSON
                  </a>
                </div>

                <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-page)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '6px', color: 'var(--color-unproductive)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiTrash2 /> Clear Tracking History
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                      Purge app sessions, web tracking logs, YouTube watch history, and summary reports permanently from your local SQLite database.
                    </p>
                  </div>
                  <button
                    onClick={handleClearHistory}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-unproductive)',
                      backgroundColor: '#FFF1F2',
                      color: 'var(--color-unproductive)',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
