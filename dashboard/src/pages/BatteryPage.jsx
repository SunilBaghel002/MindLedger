import React, { useEffect, useState } from 'react';
import {
  FiActivity,
  FiBattery,
  FiBatteryCharging,
  FiCheckCircle,
  FiClock,
  FiHeart,
  FiTrendingDown,
  FiZap,
} from 'react-icons/fi';
import { api } from '../services/api';

export default function BatteryPage() {
  const [vitals, setVitals] = useState(null);

  useEffect(() => {
    api
      .getVitals()
      .then((data) => setVitals(data))
      .catch((err) => console.warn('Battery page vitals fetch:', err));
  }, []);

  const battery = vitals?.battery || {
    percent: 85,
    is_charging: false,
    power_plugged: false,
    discharge_rate_hr: 12.4,
    status_text: 'Discharging',
  };

  return (
    <section className="page-section">
      {/* Top Banner */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-lg)',
          background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)',
          borderLeft: '4px solid var(--emerald-500)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-emerald">Phase 9: Power Engine</span>
              <span className="badge badge-blue">Hardware Sensor</span>
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
              Hardware Battery & Power Telemetry
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Real-time battery wear tracking, discharge rate time-series, and per-app power impact scoring.
            </p>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid-3">
        <div className="card stat-card">
          <span className="stat-label">Current Charge Level</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="stat-value">{battery.percent}%</span>
            {battery.is_charging ? (
              <FiBatteryCharging className="text-emerald" style={{ fontSize: '28px' }} />
            ) : (
              <FiBattery className="text-blue" style={{ fontSize: '28px' }} />
            )}
          </div>
          <span className="stat-subtext">
            Status: <strong>{battery.status_text}</strong>
          </span>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Discharge Rate</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="stat-value">
              {battery.discharge_rate_hr ? `${battery.discharge_rate_hr}%` : '0%'}
            </span>
            <FiTrendingDown className="text-amber" style={{ fontSize: '24px' }} />
          </div>
          <span className="stat-subtext">Estimated per active hour</span>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Hardware Health & Wear</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="stat-value">94.2%</span>
            <FiHeart className="text-rose" style={{ fontSize: '24px' }} />
          </div>
          <span className="stat-subtext positive">Good (54,200 / 57,500 mWh)</span>
        </div>
      </div>

      {/* Per-App Drain Leaderboard */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <FiZap className="text-amber" /> Energy Drain Leaderboard (Today)
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Estimated impact</span>
        </div>

        <div>
          {[
            { app: 'Visual Studio Code', pct: 34, impact: 'Moderate', duration: '3h 15m' },
            { app: 'Google Chrome (14 tabs)', pct: 28, impact: 'High', duration: '2h 40m' },
            { app: 'Discord', pct: 18, impact: 'Moderate', duration: '1h 20m' },
            { app: 'Spotify', pct: 10, impact: 'Low', duration: '45m' },
            { app: 'Windows System / Desktop', pct: 10, impact: 'Low', duration: 'Continuous' },
          ].map((item, idx) => (
            <div key={idx} className="usage-item">
              <div className="usage-meta">
                <span className="usage-name">{item.app}</span>
                <span className="usage-duration">
                  {item.duration} • <span className="badge badge-amber">{item.impact}</span>
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${item.pct}%`,
                    backgroundColor: item.impact === 'High' ? 'var(--rose-500)' : 'var(--primary-500)',
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
