import React, { useEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiGlobe,
  FiInfo,
  FiLayers,
  FiPause,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiShield,
  FiSlash,
  FiTag,
  FiTrash2,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import Toast from '../components/Toast';
import { api } from '../services/api';

const APP_SUGGESTIONS = [
  { id: 'discord.exe', label: 'Discord', icon: '🎮' },
  { id: 'steam.exe', label: 'Steam', icon: '🕹️' },
  { id: 'spotify.exe', label: 'Spotify', icon: '🎵' },
  { id: 'telegram.exe', label: 'Telegram', icon: '💬' },
  { id: 'slack.exe', label: 'Slack', icon: '💼' },
];

const DOMAIN_SUGGESTIONS = [
  { id: 'reddit.com', label: 'Reddit', icon: '🌐' },
  { id: 'youtube.com', label: 'YouTube', icon: '▶️' },
  { id: 'instagram.com', label: 'Instagram', icon: '📸' },
  { id: 'x.com', label: 'X / Twitter', icon: '🐦' },
  { id: 'netflix.com', label: 'Netflix', icon: '🎬' },
];

const DURATION_PRESETS = [
  { minutes: 15, label: '15m' },
  { minutes: 30, label: '30m' },
  { minutes: 45, label: '45m' },
  { minutes: 60, label: '1h' },
  { minutes: 90, label: '1h 30m' },
  { minutes: 120, label: '2h' },
  { minutes: 180, label: '3h' },
];

export default function LimitsPage() {
  const [limits, setLimits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Modal State for Creating New Limit
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetType, setTargetType] = useState('app');
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dailyLimitMinutes, setDailyLimitMinutes] = useState(45);
  const [isHardBlock, setIsHardBlock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFetchingRef = useRef(false);

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

  const fetchLimits = async (showLoading = false) => {
    if (isFetchingRef.current || document.hidden) return;
    if (showLoading && limits.length === 0) setIsLoading(true);
    isFetchingRef.current = true;

    try {
      const res = await api.getLimits();
      setLimits(res?.limits || []);
    } catch (err) {
      console.warn('Failed to fetch limits:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchLimits(true);
    const interval = setInterval(() => fetchLimits(false), 4000);

    const handleVisibility = () => {
      if (!document.hidden) fetchLimits(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateLimit = async (e) => {
    if (e) e.preventDefault();
    if (!targetIdentifier.trim() || !displayName.trim()) {
      addToast('warning', 'Please provide both an identifier and a display label.', 'Incomplete Form');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createLimit({
        target_type: targetType,
        target_identifier: targetIdentifier.trim().toLowerCase(),
        display_name: displayName.trim(),
        daily_limit_minutes: Number(dailyLimitMinutes),
        is_hard_block: isHardBlock,
      });

      addToast(
        'success',
        `Daily screen time limit of ${dailyLimitMinutes}m created for ${displayName}.`,
        'Limit Configured'
      );
      setIsAddModalOpen(false);
      setTargetIdentifier('');
      setDisplayName('');
      setDailyLimitMinutes(45);
      setIsHardBlock(false);
      fetchLimits(false);
    } catch (err) {
      addToast('danger', err.message || 'Failed to create limit rule', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplySuggestion = (item) => {
    setTargetIdentifier(item.id);
    if (!displayName || displayName === targetIdentifier) {
      setDisplayName(item.label);
    }
  };

  const handleSnooze = async (limitId, name) => {
    try {
      const res = await api.snoozeLimit(limitId);
      addToast(
        'success',
        `Granted +5m emergency pass for ${name}. New quota: ${res.effective_limit_minutes}m (${res.snoozes_remaining} passes left).`,
        'Snooze Pass Activated'
      );
      fetchLimits(false);
    } catch (err) {
      addToast('warning', err.message || 'Snooze limit reached', 'Snooze Unavailable');
    }
  };

  const handleDelete = async (limitId, name) => {
    try {
      await api.deleteLimit(limitId);
      addToast('info', `Removed daily screen time limit for ${name}.`, 'Limit Rule Deleted');
      fetchLimits(false);
    } catch (err) {
      addToast('danger', err.message || 'Failed to delete limit', 'Error');
    }
  };

  const handleToggleActive = async (limitId, currentActive) => {
    try {
      await api.updateLimit(limitId, { is_active: !currentActive });
      addToast('info', `Rule ${currentActive ? 'paused' : 'activated'}.`, 'Status Updated');
      fetchLimits(false);
    } catch (err) {
      addToast('danger', 'Failed to toggle rule state', 'Error');
    }
  };

  const activeLimits = limits.filter((l) => l.is_active);
  const exceededCount = limits.filter((l) => l.status === 'exceeded' || l.status === 'critical').length;
  const totalSnoozesLeft = limits.reduce((acc, l) => acc + (l.snoozes_remaining || 0), 0);

  const hours = Math.floor(dailyLimitMinutes / 60);
  const mins = dailyLimitMinutes % 60;
  const formattedAllowance = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

  return (
    <section className="page-section">
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* ───────── Top Hero Banner ───────── */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-lg)',
          background: 'linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 60%, #EFF6FF 100%)',
          borderLeft: '4px solid var(--rose-500)',
          padding: '22px 26px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-rose" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                <FiShield /> Digital Wellbeing
              </span>
              <span className="badge badge-blue" style={{ fontWeight: '700' }}>
                Screen Time Protection
              </span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              App & Website Limits Manager
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Enforce mindful daily boundaries on distracting desktop applications and websites with progressive warnings and emergency passes.
            </p>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            }}
          >
            <FiPlus style={{ fontSize: '18px' }} />
            <span>Add Daily Limit</span>
          </button>
        </div>
      </div>

      {/* ───────── Summary Stat Cards ───────── */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard
          label="Active Limit Rules"
          icon={<FiShield />}
          value={activeLimits.length}
          subtext="Enforcing daily screen time boundaries"
          accentColor="emerald"
          badgeText="Active"
          isPositive={true}
        />
        <StatCard
          label="Near / At Quota Today"
          icon={<FiAlertTriangle />}
          value={exceededCount}
          subtext="Apps or sites exceeding 80%+ quota"
          accentColor="rose"
          badgeText={exceededCount > 0 ? 'Warning' : 'Normal'}
          isPositive={exceededCount === 0}
        />
        <StatCard
          label="Available Emergency Passes"
          icon={<FiClock />}
          value={totalSnoozesLeft}
          subtext="+5m emergency passes remaining today"
          accentColor="amber"
          badgeText="Snooze"
          isPositive={totalSnoozesLeft > 0}
        />
      </div>

      {/* ───────── Limits Cards Grid ───────── */}
      {limits.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '18px' }}>
          {limits.map((item) => {
            const isExceeded = item.status === 'exceeded';
            const isCritical = item.status === 'critical';
            const isWarning = item.status === 'warning';

            const statusBadgeClass =
              isExceeded
                ? 'badge-rose'
                : isCritical
                ? 'badge-rose'
                : isWarning
                ? 'badge-amber'
                : 'badge-emerald';

            const progressColor =
              isExceeded || isCritical
                ? 'var(--rose-500)'
                : isWarning
                ? 'var(--amber-500)'
                : 'var(--emerald-500)';

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: item.is_active ? 1 : 0.65,
                  border: isExceeded
                    ? '1.5px solid #FDA4AF'
                    : isCritical
                    ? '1.5px solid #FED7AA'
                    : '1px solid var(--border-color)',
                  boxShadow: isExceeded
                    ? '0 4px 14px rgba(244, 63, 94, 0.12)'
                    : 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          backgroundColor: item.target_type === 'app' ? '#EFF6FF' : '#ECFEFF',
                          color: item.target_type === 'app' ? 'var(--primary-600)' : 'var(--cyan-600)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                        }}
                      >
                        {item.target_type === 'app' ? <FiLayers /> : <FiGlobe />}
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)' }}>
                          {item.display_name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {item.target_identifier} •{' '}
                          <span style={{ fontWeight: '600', color: item.is_hard_block ? 'var(--rose-600)' : 'var(--primary-600)' }}>
                            {item.is_hard_block ? '🔒 Hard Block' : '🔔 Gentle Warning'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={`badge ${statusBadgeClass}`} style={{ fontWeight: '800', fontSize: '11.5px' }}>
                      {isExceeded ? 'Exceeded' : isCritical ? '95% Quota' : isWarning ? '80% Quota' : 'Normal'}
                    </span>
                  </div>

                  {/* Quota Progress Bar */}
                  <div style={{ marginBottom: '12px', background: 'var(--bg-page)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                        {item.used_minutes}m / {item.effective_limit_minutes}m
                      </span>
                      <span style={{ fontWeight: '800', color: progressColor }}>{item.percentage_used}%</span>
                    </div>
                    <div className="progress-track" style={{ height: '8px', borderRadius: '9999px', background: '#E2E8F0' }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(100, item.percentage_used)}%`,
                          backgroundColor: progressColor,
                          borderRadius: '9999px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiClock style={{ fontSize: '13px', color: 'var(--text-muted)' }} />
                    {isExceeded ? (
                      <span style={{ color: 'var(--rose-600)', fontWeight: '700' }}>
                        Daily limit exceeded. Step away and take a screen break!
                      </span>
                    ) : (
                      <span>
                        <strong style={{ color: 'var(--text-main)' }}>{item.remaining_minutes}m</strong> remaining allowance today
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    className={`btn btn-sm ${item.is_active ? 'btn-secondary' : 'btn-subtle'}`}
                    onClick={() => handleToggleActive(item.id, item.is_active)}
                    title={item.is_active ? 'Pause Rule' : 'Activate Rule'}
                  >
                    {item.is_active ? (
                      <>
                        <FiPause style={{ fontSize: '12px' }} /> Active
                      </>
                    ) : (
                      <>
                        <FiPlay style={{ fontSize: '12px' }} /> Paused
                      </>
                    )}
                  </button>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {(isWarning || isCritical || isExceeded) && (
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{
                          color: '#D97706',
                          borderColor: '#FDE68A',
                          backgroundColor: '#FFFBEB',
                          fontWeight: '700',
                        }}
                        disabled={item.snoozes_remaining <= 0}
                        onClick={() => handleSnooze(item.id, item.display_name)}
                        title={`Extend daily allowance by +5 min (${item.snoozes_remaining} passes left today)`}
                      >
                        <FiClock /> +5m Pass ({item.snoozes_remaining})
                      </button>
                    )}

                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(item.id, item.display_name)}
                      title="Delete Limit Rule"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ───────── Modern Empty State ───────── */
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '50px 24px',
            border: '2px dashed var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 16px auto',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
            }}
          >
            <FiShield />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            No usage limits configured yet
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 22px auto', lineHeight: 1.5 }}>
            Set daily boundaries on distracting desktop applications and web domains to keep your workday focused and productive.
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            }}
          >
            <FiPlus style={{ fontSize: '18px' }} />
            <span>Create First Limit</span>
          </button>
        </div>
      )}

      {/* ───────── Redesigned Create Daily Limit Modal ───────── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title="Create Daily Screen Time Limit"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={isSubmitting}
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isSubmitting}
              onClick={handleCreateLimit}
              style={{
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              <FiCheck />
              <span>{isSubmitting ? 'Saving Rule...' : 'Save Limit Rule'}</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateLimit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Target Type Segmented Switcher */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Target Category Type
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '4px',
                background: 'var(--bg-subtle)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setTargetType('app');
                  setTargetIdentifier('');
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: targetType === 'app' ? '#FFFFFF' : 'transparent',
                  color: targetType === 'app' ? 'var(--primary-600)' : 'var(--text-secondary)',
                  fontWeight: targetType === 'app' ? '800' : '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: targetType === 'app' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <FiLayers style={{ fontSize: '16px' }} />
                <span>Desktop App (.exe)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetType('domain');
                  setTargetIdentifier('');
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: targetType === 'domain' ? '#FFFFFF' : 'transparent',
                  color: targetType === 'domain' ? 'var(--cyan-600)' : 'var(--text-secondary)',
                  fontWeight: targetType === 'domain' ? '800' : '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: targetType === 'domain' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <FiGlobe style={{ fontSize: '16px' }} />
                <span>Website Domain</span>
              </button>
            </div>
          </div>

          {/* Process / Domain Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                {targetType === 'app' ? 'Process Executable Name' : 'Website Domain URL'}
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Required</span>
            </div>

            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {targetType === 'app' ? <FiLayers /> : <FiGlobe />}
              </div>
              <input
                type="text"
                className="form-input"
                placeholder={targetType === 'app' ? 'e.g. discord.exe, steam.exe, pycharm64.exe' : 'e.g. reddit.com, youtube.com, x.com'}
                value={targetIdentifier}
                onChange={(e) => setTargetIdentifier(e.target.value)}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>

            {/* Quick Suggestions Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>Quick Presets:</span>
              {(targetType === 'app' ? APP_SUGGESTIONS : DOMAIN_SUGGESTIONS).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleApplySuggestion(s)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: targetIdentifier.toLowerCase() === s.id ? 'var(--primary-100)' : 'var(--bg-page)',
                    color: targetIdentifier.toLowerCase() === s.id ? 'var(--primary-700)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Friendly Display Label Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                Display Label
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Friendly Name</span>
            </div>

            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FiTag />
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Discord, Reddit, Gaming Quota"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>
          </div>

          {/* Daily Allowance Slider & Presets */}
          <div
            style={{
              background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
              border: '1.5px solid #E2E8F0',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                Daily Screen Time Quota
              </label>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: '800',
                  color: '#0284C7',
                  background: 'rgba(14, 165, 233, 0.12)',
                  padding: '3px 10px',
                  borderRadius: '20px',
                }}
              >
                {dailyLimitMinutes} min ({formattedAllowance})
              </span>
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min="5"
              max="240"
              step="5"
              value={dailyLimitMinutes}
              onChange={(e) => setDailyLimitMinutes(Number(e.target.value))}
              style={{
                width: '100%',
                marginBottom: '12px',
              }}
            />

            {/* Quick Preset Minutes Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {DURATION_PRESETS.map((p) => {
                const isSelected = Number(dailyLimitMinutes) === p.minutes;
                return (
                  <button
                    key={p.minutes}
                    type="button"
                    onClick={() => setDailyLimitMinutes(p.minutes)}
                    style={{
                      flex: '1',
                      minWidth: '40px',
                      padding: '5px 8px',
                      fontSize: '11.5px',
                      fontWeight: isSelected ? '800' : '600',
                      borderRadius: '6px',
                      border: `1px solid ${isSelected ? 'var(--primary-600)' : 'var(--border-color)'}`,
                      background: isSelected ? 'var(--primary-600)' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hard Block Enforcement Card */}
          <div
            onClick={() => setIsHardBlock(!isHardBlock)}
            className={`checkbox-card ${isHardBlock ? 'checked' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 16px',
              borderRadius: '10px',
              border: `1.5px solid ${isHardBlock ? '#93C5FD' : '#E2E8F0'}`,
              background: isHardBlock ? '#EFF6FF' : '#F8FAFC',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '5px',
                border: `1.5px solid ${isHardBlock ? 'var(--primary-600)' : '#CBD5E1'}`,
                backgroundColor: isHardBlock ? 'var(--primary-600)' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '12px',
                marginTop: '2px',
                flexShrink: 0,
              }}
            >
              {isHardBlock && <FiCheck />}
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: isHardBlock ? 'var(--primary-700)' : 'var(--text-main)' }}>
                Enforce Hard Block on Exceeded Quota
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                Automatically minimizes foreground application or redirects distracting web domain to a mindful focus pause page. Unchecked provides progressive soft warning toasts.
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </section>
  );
}
