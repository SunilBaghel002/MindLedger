import React, { useEffect, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCoffee,
  FiDatabase,
  FiDownload,
  FiEye,
  FiEyeOff,
  FiFolder,
  FiHardDrive,
  FiHelpCircle,
  FiLayers,
  FiLock,
  FiMail,
  FiMonitor,
  FiMoon,
  FiMusic,
  FiPauseCircle,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiSend,
  FiShield,
  FiSliders,
  FiSun,
  FiTag,
  FiTrash2,
  FiVolume2,
  FiVolumeX,
  FiZap,
} from 'react-icons/fi';
import { api } from '../services/api';

const TABS = [
  { id: 'general', label: 'General & Tracking', icon: <FiSliders />, desc: 'Tracking status, idle threshold & preferences' },
  { id: 'tracking_mode', label: 'Screen Time Modes', icon: <FiMonitor />, desc: 'Background media & multi-tasking rules' },
  { id: 'email', label: 'Email & SMTP', icon: <FiMail />, desc: 'Automated report delivery & SMTP setup' },
  { id: 'rules', label: 'Category Rules', icon: <FiTag />, desc: 'Custom app & website classification' },
  { id: 'data', label: 'Data & Privacy', icon: <FiLock />, desc: 'Database backups, export & privacy cleanup' },
];

const IDLE_PRESETS = [
  { label: '1 min', seconds: 60 },
  { label: '3 mins', seconds: 180 },
  { label: '5 mins', seconds: 300, recommended: true },
  { label: '10 mins', seconds: 600 },
  { label: '15 mins', seconds: 900 },
];

const QUICK_RULES = [
  { rule_type: 'app', pattern: 'figma.exe', category: 'Design', productivity: 'productive' },
  { rule_type: 'app', pattern: 'spotify.exe', category: 'Music', productivity: 'neutral' },
  { rule_type: 'app', pattern: 'steam.exe', category: 'Gaming', productivity: 'unproductive' },
  { rule_type: 'domain', pattern: 'chatgpt.com', category: 'Coding', productivity: 'productive' },
  { rule_type: 'domain', pattern: 'coursera.org', category: 'Learning', productivity: 'productive' },
  { rule_type: 'domain', pattern: 'reddit.com', category: 'Social Media', productivity: 'unproductive' },
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
  const [rulesSearch, setRulesSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [cleaningData, setCleaningData] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [retentionMonths, setRetentionMonths] = useState(6);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
        setActionMessage({ type: 'success', text: 'Settings updated and saved successfully!' });
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
          text: res.message || 'Test email dispatched successfully to ' + (settingsData.recipient_email || 'recipient'),
        });
      })
      .catch((err) => {
        setTestingEmail(false);
        setActionMessage({ type: 'error', text: err.message || 'Test email failed. Please check SMTP host and credentials.' });
      });
  };

  // Quick Preset Provider for SMTP
  const handleApplySmtpPreset = (provider) => {
    if (provider === 'gmail') {
      setSettingsData((p) => ({ ...p, smtp_host: 'smtp.gmail.com', smtp_port: 587 }));
    } else if (provider === 'outlook') {
      setSettingsData((p) => ({ ...p, smtp_host: 'smtp.office365.com', smtp_port: 587 }));
    } else if (provider === 'sendgrid') {
      setSettingsData((p) => ({ ...p, smtp_host: 'smtp.sendgrid.net', smtp_port: 587, smtp_username: 'apikey' }));
    }
    setActionMessage({ type: 'success', text: `Applied ${provider.toUpperCase()} SMTP configuration presets.` });
  };

  // Create Category Rule
  const handleAddRule = (e) => {
    if (e) e.preventDefault();
    if (!newRule.pattern.trim() || !newRule.category.trim()) {
      setActionMessage({ type: 'error', text: 'Pattern and Category name are required.' });
      return;
    }

    api
      .createCategoryRule(newRule)
      .then(() => {
        setNewRule({ rule_type: 'app', pattern: '', category: '', productivity: 'productive', priority: 10 });
        setActionMessage({ type: 'success', text: 'Custom classification rule added successfully!' });
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
        setActionMessage({ type: 'success', text: 'Classification rule deleted.' });
        loadData();
      })
      .catch((err) => {
        setActionMessage({ type: 'error', text: err.message || 'Failed to delete rule' });
      });
  };

  // Trigger Database Backup
  const handleCreateBackup = () => {
    setCreatingBackup(true);
    setActionMessage(null);
    api
      .createBackup()
      .then((res) => {
        setCreatingBackup(false);
        setActionMessage({
          type: 'success',
          text: `Snapshot backup created: ${res.filename || 'mindledger_backup.db.bak'}`,
        });
      })
      .catch((err) => {
        setCreatingBackup(false);
        setActionMessage({ type: 'error', text: err.message || 'Failed to create database backup' });
      });
  };

  // Trigger Data Cleanup / Pruning
  const handleCleanupData = () => {
    setCleaningData(true);
    setActionMessage(null);
    api
      .cleanupData(retentionMonths)
      .then((res) => {
        setCleaningData(false);
        setActionMessage({
          type: 'success',
          text: `Data pruned: Archived sessions older than ${retentionMonths} months into ${res.archive_file || 'logs/archives'}.`,
        });
      })
      .catch((err) => {
        setCleaningData(false);
        setActionMessage({ type: 'error', text: err.message || 'Failed to prune database records' });
      });
  };

  // Clear Tracking History
  const handleClearHistory = () => {
    setShowClearConfirm(false);
    api
      .clearHistory()
      .then((res) => {
        setActionMessage({ type: 'success', text: res.message || 'All tracking history permanently cleared.' });
      })
      .catch((err) => {
        setActionMessage({ type: 'error', text: err.message || 'Failed to clear history' });
      });
  };

  const exportJsonUrl = api.getExportDataUrl('json');
  const exportCsvUrl = api.getDataExportUrl('csv', 'app_sessions');

  const filteredRules = categoryRules.filter(
    (r) =>
      r.pattern?.toLowerCase().includes(rulesSearch.toLowerCase()) ||
      r.category?.toLowerCase().includes(rulesSearch.toLowerCase()) ||
      r.rule_type?.toLowerCase().includes(rulesSearch.toLowerCase())
  );

  return (
    <section className="page-section" style={{ paddingBottom: '40px' }}>
      {/* ───────── Top Navigation & Header ───────── */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)', padding: '20px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#2563EB', display: 'flex' }}><FiSliders /></span>
              MindLedger System Preferences
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Configure real-time window tracking, idle threshold, email digests, and classification rules.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: settingsData.tracking_enabled ? '#ECFDF5' : '#FEF2F2',
                color: settingsData.tracking_enabled ? '#059669' : '#DC2626',
                border: `1px solid ${settingsData.tracking_enabled ? '#A7F3D0' : '#FECDD3'}`,
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: settingsData.tracking_enabled ? '#10B981' : '#EF4444',
                  boxShadow: settingsData.tracking_enabled ? '0 0 8px #10B981' : 'none',
                }}
              />
              {settingsData.tracking_enabled ? 'Tracking Engine Active' : 'Tracking Paused'}
            </span>

            <button
              onClick={loadData}
              title="Refresh settings"
              className="btn btn-secondary btn-sm"
            >
              <FiRefreshCw style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>
        </div>

        {/* Segmented SaaS Tab Bar */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            padding: '4px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {TABS.map((t) => {
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                aria-pressed={isSelected}
                style={{
                  flex: '1',
                  minWidth: '160px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid #BFDBFE' : '1px solid transparent',
                  backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                  color: isSelected ? '#1D4ED8' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 700 : 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: '15px', color: isSelected ? '#2563EB' : 'var(--text-muted)' }}>
                  {t.icon}
                </span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Global Action Status Alert Banner */}
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
              justifyContent: 'space-between',
              gap: '8px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {actionMessage.type === 'success' ? <FiCheckCircle style={{ fontSize: '16px' }} /> : <FiAlertTriangle style={{ fontSize: '16px' }} />}
              {actionMessage.text}
            </div>
            <button
              onClick={() => setActionMessage(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px', fontWeight: 800 }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div className="skeleton-loader" style={{ width: '40%', height: '16px', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading system preferences...</p>
        </div>
      ) : (
        <>
          {/* ════════════════ TAB 1: General & Tracking ════════════════ */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Top Row: Engine Switch & Inactivity Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                {/* Real-time Tracking Toggle Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            backgroundColor: settingsData.tracking_enabled ? '#EFF6FF' : '#F1F5F9',
                            color: settingsData.tracking_enabled ? '#2563EB' : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                          }}
                        >
                          <FiActivity />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                            Real-Time Activity Engine
                          </h3>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Background polling at 1-second interval
                          </span>
                        </div>
                      </div>

                      {/* Switch Button */}
                      <button
                        onClick={() => {
                          const updated = !settingsData.tracking_enabled;
                          setSettingsData((p) => ({ ...p, tracking_enabled: updated }));
                          handleSaveSettings({ ...settingsData, tracking_enabled: updated });
                        }}
                        style={{
                          width: '52px',
                          height: '28px',
                          borderRadius: '14px',
                          backgroundColor: settingsData.tracking_enabled ? '#2563EB' : '#CBD5E1',
                          border: 'none',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background-color 0.2s ease',
                          padding: '2px',
                        }}
                        title={settingsData.tracking_enabled ? 'Click to Pause Tracking' : 'Click to Resume Tracking'}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#FFFFFF',
                            transform: settingsData.tracking_enabled ? 'translateX(24px)' : 'translateX(0)',
                            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }}
                        />
                      </button>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                      When active, MindLedger scans the active Windows foreground process and classifies productivity using local SQLite rules. Pausing tracking temporarily stops logging window switches.
                    </p>
                  </div>

                  <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>Engine Status: <strong style={{ color: settingsData.tracking_enabled ? '#059669' : '#DC2626' }}>{settingsData.tracking_enabled ? 'Active (Recording)' : 'Paused'}</strong></span>
                    <span>Local Database Only</span>
                  </div>
                </div>

                {/* Idle Timeout Calibration Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            backgroundColor: '#FEF3C7',
                            color: '#D97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                          }}
                        >
                          <FiClock />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                            Idle Detection Threshold
                          </h3>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Keyboard & mouse inactivity trigger
                          </span>
                        </div>
                      </div>

                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '4px 10px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                        {Math.floor(settingsData.idle_threshold_seconds / 60)}m {settingsData.idle_threshold_seconds % 60}s ({settingsData.idle_threshold_seconds}s)
                      </span>
                    </div>

                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0 0 14px 0' }}>
                      If no input is detected for this duration, tracking automatically enters <em>Idle State</em> and deducts away-time to prevent inflated screen time.
                    </p>

                    {/* Quick Preset Chips */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                      {IDLE_PRESETS.map((p) => {
                        const isMatch = settingsData.idle_threshold_seconds === p.seconds;
                        return (
                          <button
                            key={p.seconds}
                            onClick={() => {
                              setSettingsData((prev) => ({ ...prev, idle_threshold_seconds: p.seconds }));
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: isMatch ? '1.5px solid #2563EB' : '1px solid var(--border-color)',
                              backgroundColor: isMatch ? '#EFF6FF' : 'var(--bg-page)',
                              color: isMatch ? '#1D4ED8' : 'var(--text-secondary)',
                              fontWeight: isMatch ? 700 : 500,
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {p.label} {p.recommended && '★'}
                          </button>
                        );
                      })}
                    </div>

                    {/* Interactive Slider */}
                    <input
                      type="range"
                      min="60"
                      max="1800"
                      step="30"
                      value={settingsData.idle_threshold_seconds}
                      onChange={(e) => setSettingsData((p) => ({ ...p, idle_threshold_seconds: parseInt(e.target.value) }))}
                      style={{ width: '100%', accentColor: '#2563EB', cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleSaveSettings()}
                      disabled={saving}
                      className="btn btn-primary btn-sm"
                    >
                      <FiSave /> {saving ? 'Saving...' : 'Save Idle Setting'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Diagnostics & Application Information */}
              <div className="card">
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiHardDrive style={{ color: '#2563EB' }} /> Local MindLedger System Vitals
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>DATABASE ARCHITECTURE</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>SQLite 3 (Local Encrypted)</div>
                    <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>✓ Zero cloud telemetry</div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>API BINDING</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>127.0.0.1:8787</div>
                    <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '2px' }}>✓ Fast loopback connection</div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>BROWSER INTEGRATION</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>Chrome MV3 Extension</div>
                    <div style={{ fontSize: '11px', color: '#7C3AED', marginTop: '2px' }}>✓ Active Heartbeat Enabled</div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>SYSTEM VERSION</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>MindLedger v2.0 SaaS</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Build: Phase 7-12 Certified</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ TAB 2: Screen Time Modes ════════════════ */}
          {activeTab === 'tracking_mode' && (
            <div className="card" style={{ maxWidth: '840px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 6px 0' }}>
                  <FiMonitor style={{ color: '#2563EB' }} /> Screen Time & Background Activity Modes
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Choose how MindLedger calculates total screen time when background music (YouTube / Spotify / Lo-Fi) is playing while you work.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {/* Mode 1: Ignore Background Tasks & Media (Recommended) */}
                <div
                  onClick={() => {
                    const updated = 'ignore_background';
                    setSettingsData((p) => ({ ...p, tracking_mode: updated }));
                    handleSaveSettings({ ...settingsData, tracking_mode: updated });
                  }}
                  style={{
                    border: settingsData.tracking_mode === 'ignore_background' ? '2px solid #2563EB' : '1px solid var(--border-color)',
                    backgroundColor: settingsData.tracking_mode === 'ignore_background' ? '#EFF6FF' : 'var(--bg-surface)',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    boxShadow: settingsData.tracking_mode === 'ignore_background' ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: settingsData.tracking_mode === 'ignore_background' ? '6px solid #2563EB' : '2px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiMusic style={{ color: '#10B981', fontSize: '17px' }} /> Ignore Background Tasks & Media
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
                        ★ Recommended for Coding & Music
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      When you play YouTube songs or music playlists in the background while coding or browsing, background audio <strong>will NOT</strong> inflate your active screen time. Your current active foreground task gets 100% accurate credit.
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
                    border: settingsData.tracking_mode === 'record_both' ? '2px solid #2563EB' : '1px solid var(--border-color)',
                    backgroundColor: settingsData.tracking_mode === 'record_both' ? '#EFF6FF' : 'var(--bg-surface)',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    boxShadow: settingsData.tracking_mode === 'record_both' ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: settingsData.tracking_mode === 'record_both' ? '6px solid #2563EB' : '2px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiLayers style={{ color: '#3B82F6', fontSize: '17px' }} /> Record Background & Current Screen Together
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                        Dual Multi-Tasking
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      Simultaneously records both active foreground applications and background YouTube media sessions. Total screen time includes both foreground active focus and background video playback.
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
                    border: settingsData.tracking_mode === 'foreground_only' ? '2px solid #2563EB' : '1px solid var(--border-color)',
                    backgroundColor: settingsData.tracking_mode === 'foreground_only' ? '#EFF6FF' : 'var(--bg-surface)',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    boxShadow: settingsData.tracking_mode === 'foreground_only' ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: settingsData.tracking_mode === 'foreground_only' ? '6px solid #2563EB' : '2px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiMonitor style={{ color: '#8B5CF6', fontSize: '17px' }} /> Record Current Screen Task Only
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
                        Strict Single-Focus
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      Strict single-window mode. Only tracks the specific application window currently focused and receiving keyboard/mouse input. Completely ignores background browser media.
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Mode Banner */}
              <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiCheckCircle style={{ color: '#10B981', fontSize: '16px' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Active Mode:{' '}
                    <strong>
                      {settingsData.tracking_mode === 'ignore_background'
                        ? 'Ignore Background Tasks & Media'
                        : settingsData.tracking_mode === 'record_both'
                        ? 'Record Both Together'
                        : 'Record Current Task Only'}
                    </strong>
                  </span>
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Changes saved automatically</span>
              </div>
            </div>
          )}

          {/* ════════════════ TAB 3: Email & SMTP ════════════════ */}
          {activeTab === 'email' && (
            <div className="card" style={{ maxWidth: '840px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiMail style={{ color: '#2563EB' }} /> SMTP Email Server & Report Delivery
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    Configure credentials to automatically dispatch daily and weekly productivity reports.
                  </p>
                </div>

                {/* Provider Presets */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleApplySmtpPreset('gmail')} className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}>
                    + Gmail Preset
                  </button>
                  <button onClick={() => handleApplySmtpPreset('outlook')} className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}>
                    + Outlook Preset
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '12.5px', marginBottom: '6px', color: 'var(--text-main)' }}>
                    SMTP Host / Server
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. smtp.gmail.com"
                    value={settingsData.smtp_host}
                    onChange={(e) => setSettingsData((p) => ({ ...p, smtp_host: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '12.5px', marginBottom: '6px', color: 'var(--text-main)' }}>
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    placeholder="587"
                    value={settingsData.smtp_port}
                    onChange={(e) => setSettingsData((p) => ({ ...p, smtp_port: parseInt(e.target.value) || 587 }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '12.5px', marginBottom: '6px', color: 'var(--text-main)' }}>
                    SMTP Username / Sender Email
                  </label>
                  <input
                    type="text"
                    placeholder="your-email@gmail.com"
                    value={settingsData.smtp_username}
                    onChange={(e) => setSettingsData((p) => ({ ...p, smtp_username: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '12.5px', marginBottom: '6px', color: 'var(--text-main)' }}>
                    SMTP App Password / Secret
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••••••"
                      value={settingsData.smtp_password || ''}
                      onChange={(e) => setSettingsData((p) => ({ ...p, smtp_password: e.target.value }))}
                      style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '12.5px', marginBottom: '6px', color: 'var(--text-main)' }}>
                    Report Recipient Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={settingsData.recipient_email}
                    onChange={(e) => setSettingsData((p) => ({ ...p, recipient_email: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Daily and weekly analytical reports will be delivered directly to this inbox.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => handleSaveSettings()}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  <FiSave /> {saving ? 'Saving Credentials...' : 'Save Email Configuration'}
                </button>

                <button
                  onClick={handleTestEmail}
                  disabled={testingEmail || !settingsData.smtp_host}
                  className="btn btn-secondary"
                >
                  <FiSend style={{ animation: testingEmail ? 'spin 1s linear infinite' : 'none' }} />
                  {testingEmail ? 'Sending Test...' : 'Dispatch Test Email'}
                </button>
              </div>
            </div>
          )}

          {/* ════════════════ TAB 4: Category Classification Rules ════════════════ */}
          {activeTab === 'rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Add New Rule Card */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiPlus style={{ color: '#2563EB' }} /> Create Custom Classification Rule
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    High-priority rules override default AI classification
                  </span>
                </div>

                {/* Quick Add Suggestions */}
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Quick-Add Templates:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {QUICK_RULES.map((qr, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNewRule({ ...qr, priority: 20 })}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-main)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        + {qr.pattern} ({qr.category})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Inputs Grid */}
                <form onSubmit={handleAddRule}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 120px auto', gap: '12px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-main)' }}>
                        Rule Target Type
                      </label>
                      <select
                        value={newRule.rule_type}
                        onChange={(e) => setNewRule((p) => ({ ...p, rule_type: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', color: 'var(--text-main)' }}
                      >
                        <option value="app">App Process (.exe)</option>
                        <option value="domain">Website Domain</option>
                        <option value="url_pattern">URL Keyword</option>
                        <option value="youtube_channel">YouTube Channel</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-main)' }}>
                        Pattern / Keyword
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. figma.exe, github.com"
                        value={newRule.pattern}
                        onChange={(e) => setNewRule((p) => ({ ...p, pattern: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', color: 'var(--text-main)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-main)' }}>
                        Assigned Category
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Coding, Design, Gaming"
                        value={newRule.category}
                        onChange={(e) => setNewRule((p) => ({ ...p, category: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', color: 'var(--text-main)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-main)' }}>
                        Productivity Impact
                      </label>
                      <select
                        value={newRule.productivity}
                        onChange={(e) => setNewRule((p) => ({ ...p, productivity: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', color: 'var(--text-main)' }}
                      >
                        <option value="productive">Productive (+)</option>
                        <option value="learning">Learning (~)</option>
                        <option value="neutral">Neutral (=)</option>
                        <option value="unproductive">Unproductive (-)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-main)' }}>
                        Priority
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newRule.priority}
                        onChange={(e) => setNewRule((p) => ({ ...p, priority: parseInt(e.target.value) || 10 }))}
                        style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', color: 'var(--text-main)' }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ height: '40px' }}
                    >
                      <FiPlus /> Add Rule
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Rules List */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      Active Classification Rules
                    </h3>
                    <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                      {categoryRules.length} rules
                    </span>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }} />
                    <input
                      type="text"
                      placeholder="Search rules..."
                      value={rulesSearch}
                      onChange={(e) => setRulesSearch(e.target.value)}
                      style={{ padding: '6px 12px 6px 30px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', color: 'var(--text-main)', fontSize: '12.5px', width: '180px', outline: 'none' }}
                    />
                  </div>
                </div>

                {filteredRules.length > 0 ? (
                  <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '10%' }}>Priority</th>
                          <th style={{ width: '16%' }}>Target Type</th>
                          <th style={{ width: '28%' }}>Pattern / Target</th>
                          <th style={{ width: '22%' }}>Assigned Category</th>
                          <th style={{ width: '14%' }}>Productivity</th>
                          <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRules.map((rule) => (
                          <tr key={rule.id}>
                            <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{rule.priority}</td>
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  textTransform: 'capitalize',
                                  backgroundColor: rule.rule_type === 'app' ? '#EFF6FF' : rule.rule_type === 'domain' ? '#ECFDF5' : '#F5F3FF',
                                  color: rule.rule_type === 'app' ? '#2563EB' : rule.rule_type === 'domain' ? '#059669' : '#7C3AED',
                                }}
                              >
                                {rule.rule_type}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{rule.pattern}</td>
                            <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{rule.category}</td>
                            <td>
                              <span className={`badge badge-${rule.productivity || 'neutral'}`}>
                                {rule.productivity}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                title="Delete rule"
                                className="btn btn-danger btn-sm"
                                style={{ padding: '4px 8px', fontSize: '11.5px' }}
                              >
                                <FiTrash2 /> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '36px 20px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
                    <FiTag style={{ fontSize: '28px', color: 'var(--text-muted)', marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>No rules match your search</p>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>Add a custom classification rule above or reset your search query.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════ TAB 5: Data Management, Backups & Privacy ════════════════ */}
          {activeTab === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                {/* Export Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                        <FiDownload />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                          Export Activity Dataset
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Download complete activity records
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                      Export all granular desktop window sessions, browser domains, and YouTube activities into structured JSON or CSV spreadsheet formats.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <a
                      href={exportJsonUrl}
                      download
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}
                    >
                      <FiDownload /> Download JSON
                    </a>
                    <a
                      href={exportCsvUrl}
                      download
                      className="btn btn-secondary btn-sm"
                      style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}
                    >
                      <FiDownload /> Download CSV
                    </a>
                  </div>
                </div>

                {/* Database Backup Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                        <FiDatabase />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                          Create Database Snapshot
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Instant online SQLite backup
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                      Generates a hot SQLite snapshot file (<code>mindledger_backup.db.bak</code>) stored locally in <code>logs/backups/</code> for easy restoration.
                    </p>
                  </div>

                  <button
                    onClick={handleCreateBackup}
                    disabled={creatingBackup}
                    className="btn btn-secondary"
                    style={{ color: '#059669', borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }}
                  >
                    <FiDatabase style={{ animation: creatingBackup ? 'spin 1s linear infinite' : 'none' }} />
                    {creatingBackup ? 'Creating Snapshot...' : 'Create Snapshot Backup'}
                  </button>
                </div>
              </div>

              {/* Data Pruning & Retention Card */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                      <FiFolder />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        Data Retention & Archival Cleanup
                      </h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Compress old sessions into ZIP archive and free disk space
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Keep Last:</span>
                    <select
                      value={retentionMonths}
                      onChange={(e) => setRetentionMonths(parseInt(e.target.value))}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', fontSize: '12.5px', fontWeight: 700 }}
                    >
                      <option value="3">3 Months</option>
                      <option value="6">6 Months (Recommended)</option>
                      <option value="12">12 Months</option>
                      <option value="24">24 Months</option>
                    </select>

                    <button
                      onClick={handleCleanupData}
                      disabled={cleaningData}
                      className="btn btn-secondary btn-sm"
                    >
                      <FiFolder /> {cleaningData ? 'Archiving...' : 'Archive & Prune Now'}
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                  Sessions older than the selected retention period will be cleanly exported into a ZIP archive file inside <code>logs/archives/</code> before being deleted from the active SQLite database.
                </p>
              </div>

              {/* Danger Zone: Clear History */}
              <div className="card" style={{ border: '1.5px solid #FECDD3', backgroundColor: '#FFF5F5' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 4px 0', color: '#BE123C', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiAlertTriangle /> Danger Zone: Clear All Tracking History
                    </h3>
                    <p style={{ fontSize: '12.5px', color: '#881337', margin: 0 }}>
                      Permanently wipes all app sessions, browser visits, YouTube logs, and generated summary reports from SQLite.
                    </p>
                  </div>

                  {showClearConfirm ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={handleClearHistory}
                        className="btn btn-danger"
                      >
                        Yes, Permanently Delete All Data
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="btn btn-danger"
                    >
                      <FiTrash2 /> Clear All Tracking History
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
