import React, { useState } from 'react';
import {
  FiAlertTriangle,
  FiCheck,
  FiClock,
  FiEdit2,
  FiGlobe,
  FiLayers,
  FiPlus,
  FiShield,
  FiSlash,
  FiTrash2,
} from 'react-icons/fi';
import Modal from '../components/Modal';

export default function LimitsPage() {
  const [limits, setLimits] = useState([
    {
      id: 1,
      target: 'Discord.exe',
      type: 'app',
      limitMins: 60,
      usedMins: 45,
      mode: 'soft', // soft warning vs hard block
      enabled: true,
    },
    {
      id: 2,
      target: 'youtube.com',
      type: 'domain',
      limitMins: 90,
      usedMins: 40,
      mode: 'hard',
      enabled: true,
    },
    {
      id: 3,
      target: 'reddit.com',
      type: 'domain',
      limitMins: 30,
      usedMins: 28,
      mode: 'hard',
      enabled: true,
    },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [newType, setNewType] = useState('app');
  const [newLimitMins, setNewLimitMins] = useState(60);

  const handleAddLimit = () => {
    if (!newTarget.trim()) return;
    const newEntry = {
      id: Date.now(),
      target: newTarget.trim(),
      type: newType,
      limitMins: Number(newLimitMins) || 60,
      usedMins: 0,
      mode: 'soft',
      enabled: true,
    };
    setLimits([...limits, newEntry]);
    setNewTarget('');
    setIsAddModalOpen(false);
  };

  const handleDelete = (id) => {
    setLimits(limits.filter((l) => l.id !== id));
  };

  const handleToggle = (id) => {
    setLimits(
      limits.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );
  };

  return (
    <section className="page-section">
      {/* Top Banner */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-lg)',
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)',
          borderLeft: '4px solid var(--amber-500)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-amber">Phase 10: Digital Wellbeing</span>
              <span className="badge badge-rose">Limit Enforcement</span>
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
              App & Website Screen Time Limits
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Set daily minute budgets on apps and domains, get progressive 80%/95% warnings, and enforce focus blocks.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <FiPlus /> Add Daily Limit
          </button>
        </div>
      </div>

      {/* Limit Cards Grid */}
      <div className="grid-3">
        {limits.map((limit) => {
          const pct = Math.min(100, Math.round((limit.usedMins / limit.limitMins) * 100));
          const isWarning = pct >= 80;
          const isBreached = pct >= 100;

          return (
            <div key={limit.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                    {limit.type === 'app' ? (
                      <FiLayers className="text-blue" />
                    ) : (
                      <FiGlobe className="text-purple" />
                    )}
                    <span>{limit.target}</span>
                  </div>
                  <span className={`badge ${limit.enabled ? (isBreached ? 'badge-rose' : isWarning ? 'badge-amber' : 'badge-emerald') : 'badge-neutral'}`}>
                    {limit.enabled ? `${pct}% used` : 'Paused'}
                  </span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {limit.usedMins}m spent
                    </span>
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                      {limit.limitMins}m limit
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          pct >= 90
                            ? 'var(--rose-500)'
                            : pct >= 75
                            ? 'var(--amber-500)'
                            : 'var(--primary-500)',
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {limit.mode === 'hard' ? '🛡️ Hard Block' : '⚠️ Soft Nudge'}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-sm btn-subtle"
                    onClick={() => handleToggle(limit.id)}
                  >
                    {limit.enabled ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(limit.id)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Limit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Daily Screen Time Limit"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAddLimit}>
              Save Limit
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Target Type
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className={`btn btn-sm ${newType === 'app' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setNewType('app')}
              >
                Desktop Application (.exe)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${newType === 'domain' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setNewType('domain')}
              >
                Website Domain
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Target Name (e.g. Steam.exe or twitter.com)
            </label>
            <input
              type="text"
              className="card"
              placeholder={newType === 'app' ? 'e.g. Spotify.exe' : 'e.g. reddit.com'}
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Daily Limit (Minutes): {newLimitMins}m ({Math.round((newLimitMins / 60) * 10) / 10}h)
            </label>
            <input
              type="range"
              min="10"
              max="360"
              step="5"
              value={newLimitMins}
              onChange={(e) => setNewLimitMins(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </Modal>
    </section>
  );
}
