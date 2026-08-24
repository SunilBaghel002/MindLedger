import React, { useEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiClock,
  FiGlobe,
  FiLayers,
  FiPlus,
  FiShield,
  FiSlash,
  FiTrash2,
  FiZap,
} from 'react-icons/fi';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { api } from '../services/api';

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
  }, []);

  const handleCreateLimit = async (e) => {
    e.preventDefault();
    if (!targetIdentifier.trim() || !displayName.trim()) {
      addToast('warning', 'Please fill in all required fields.', 'Incomplete Form');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createLimit({
        target_type: targetType,
        target_identifier: targetIdentifier.trim(),
        display_name: displayName.trim(),
        daily_limit_minutes: Number(dailyLimitMinutes),
        is_hard_block: isHardBlock,
      });

      addToast(
        'success',
        `Daily limit of ${dailyLimitMinutes}m set for ${displayName}.`,
        'Limit Created'
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

  const handleSnooze = async (limitId, name) => {
    try {
      const res = await api.snoozeLimit(limitId);
      addToast(
        'success',
        `Granted +5m emergency pass for ${name}. New quota: ${res.effective_limit_minutes}m (${res.snoozes_remaining} snoozes left today).`,
        'Snooze Activated'
      );
      fetchLimits(false);
    } catch (err) {
      addToast('warning', err.message || 'Snooze limit reached', 'Snooze Unavailable');
    }
  };

  const handleDelete = async (limitId, name) => {
    try {
      await api.deleteLimit(limitId);
      addToast('info', `Removed daily limit for ${name}.`, 'Limit Deleted');
      fetchLimits(false);
    } catch (err) {
      addToast('danger', err.message || 'Failed to delete limit', 'Error');
    }
  };

  const handleToggleActive = async (limitId, currentActive) => {
    try {
      await api.updateLimit(limitId, { is_active: !currentActive });
      fetchLimits(false);
    } catch (err) {
      addToast('danger', 'Failed to toggle rule state', 'Error');
    }
  };

  const activeLimits = limits.filter((l) => l.is_active);
  const exceededCount = limits.filter((l) => l.status === 'exceeded' || l.status === 'critical').length;
  const totalSnoozesLeft = limits.reduce((acc, l) => acc + (l.snoozes_remaining || 0), 0);

  return (
    <section className="page-section">
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Top Banner */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-lg)',
          background: 'linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 100%)',
          borderLeft: '4px solid var(--rose-500)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-rose">Digital Wellbeing</span>
              <span className="badge badge-blue">Screen Time Protection</span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
              App & Website Limits Manager
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Configure daily screen time quotas with progressive warnings (80%, 95%) and emergency snooze passes.
            </p>
          </div>

          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <FiPlus /> Add Daily Limit
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card stat-card">
          <div className="card-header">
            <span className="stat-label">Active Limit Rules</span>
            <FiShield className="text-emerald" style={{ fontSize: '24px' }} />
          </div>
          <div className="stat-value">{activeLimits.length}</div>
          <div className="stat-subtext">
            <span>Enforcing daily screen time boundaries</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="card-header">
            <span className="stat-label">Near / At Quota Today</span>
            <FiAlertTriangle className="text-rose" style={{ fontSize: '24px' }} />
          </div>
          <div className="stat-value">{exceededCount}</div>
          <div className="stat-subtext">
            <span>Apps or sites exceeding 80%+ of quota</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="card-header">
            <span className="stat-label">Available Emergency Snoozes</span>
            <FiClock className="text-amber" style={{ fontSize: '24px' }} />
          </div>
          <div className="stat-value">{totalSnoozesLeft}</div>
          <div className="stat-subtext">
            <span>+5m emergency passes remaining today</span>
          </div>
        </div>
      </div>

      {/* Limits Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {limits.length > 0 ? (
          limits.map((item) => {
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
                  opacity: item.is_active ? 1 : 0.6,
                  border: isExceeded ? '1px solid var(--rose-300)' : '1px solid var(--border-color)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.target_type === 'app' ? (
                        <FiLayers style={{ color: 'var(--primary-blue)', fontSize: '18px' }} />
                      ) : (
                        <FiGlobe style={{ color: 'var(--cyan-600)', fontSize: '18px' }} />
                      )}
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{item.display_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {item.target_identifier} • {item.is_hard_block ? '🔒 Hard Block' : '🔔 Gentle Alert'}
                        </div>
                      </div>
                    </div>

                    <span className={`badge ${statusBadgeClass}`}>
                      {isExceeded ? 'Exceeded' : isCritical ? '95% Quota' : isWarning ? '80% Quota' : 'Normal'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600' }}>
                        {item.used_minutes}m / {item.effective_limit_minutes}m
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{item.percentage_used}%</span>
                    </div>
                    <div className="progress-track" style={{ height: '8px' }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(100, item.percentage_used)}%`,
                          backgroundColor: progressColor,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    {isExceeded
                      ? 'Daily limit exceeded. Take a break!'
                      : `${item.remaining_minutes}m remaining today`}
                  </div>
                </div>

                {/* Card Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <button
                    className="btn btn-sm btn-subtle"
                    onClick={() => handleToggleActive(item.id, item.is_active)}
                  >
                    {item.is_active ? 'Active' : 'Paused'}
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(isWarning || isCritical || isExceeded) && (
                      <button
                        className="btn btn-sm btn-secondary"
                        disabled={item.snoozes_remaining <= 0}
                        onClick={() => handleSnooze(item.id, item.display_name)}
                        title={`Extend by +5 min (${item.snoozes_remaining} left)`}
                      >
                        <FiClock /> +5m Snooze ({item.snoozes_remaining})
                      </button>
                    )}

                    <button
                      className="btn btn-sm btn-subtle"
                      style={{ color: 'var(--rose-500)' }}
                      onClick={() => handleDelete(item.id, item.display_name)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <FiShield style={{ fontSize: '32px', color: 'var(--text-muted)', marginBottom: '10px' }} />
            <div style={{ fontWeight: '600', marginBottom: '6px' }}>No usage limits configured yet</div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Set daily boundaries on distracting desktop applications and web domains.
            </p>
            <button className="btn btn-sm btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <FiPlus /> Create First Limit
            </button>
          </div>
        )}
      </div>

      {/* Add Limit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title="Create Daily Screen Time Limit"
        footer={
          <>
            <button
              className="btn btn-secondary"
              disabled={isSubmitting}
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={isSubmitting}
              onClick={handleCreateLimit}
            >
              {isSubmitting ? 'Saving...' : 'Save Limit Rule'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateLimit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
              Target Type
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${targetType === 'app' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTargetType('app')}
                style={{ flex: 1 }}
              >
                <FiLayers /> Application (.exe)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${targetType === 'domain' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTargetType('domain')}
                style={{ flex: 1 }}
              >
                <FiGlobe /> Website Domain
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
              {targetType === 'app' ? 'Process Name (e.g. Discord.exe, Steam.exe)' : 'Domain Name (e.g. reddit.com, twitter.com)'}
            </label>
            <input
              type="text"
              className="form-input"
              placeholder={targetType === 'app' ? 'discord.exe' : 'reddit.com'}
              value={targetIdentifier}
              onChange={(e) => setTargetIdentifier(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
              Display Label
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Discord or Reddit"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
              }}
              required
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600' }}>Daily Allowance</label>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary-blue)' }}>
                {dailyLimitMinutes} minutes ({Math.floor(dailyLimitMinutes / 60)}h {dailyLimitMinutes % 60}m)
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="240"
              step="5"
              value={dailyLimitMinutes}
              onChange={(e) => setDailyLimitMinutes(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <input
              type="checkbox"
              id="hardBlockCheck"
              checked={isHardBlock}
              onChange={(e) => setIsHardBlock(e.target.checked)}
            />
            <label htmlFor="hardBlockCheck" style={{ fontSize: '13px', color: 'var(--text-main)' }}>
              Enforce Hard Block (Minimize app / Block web domain on limit)
            </label>
          </div>
        </form>
      </Modal>
    </section>
  );
}
