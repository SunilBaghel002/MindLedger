import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { secondsToHms } from '../utils/formatters';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'apps', label: 'Applications', icon: '📱' },
  { id: 'browser', label: 'Browser', icon: '🌐' },
  { id: 'youtube', label: 'YouTube', icon: '📺' },
  { id: 'reports', label: 'Reports', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar({ activeSection, onSelectSection }) {
  const [liveStatus, setLiveStatus] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchLive = async () => {
      try {
        const data = await api.getLiveStatus();
        if (isMounted) setLiveStatus(data);
      } catch (e) {
        if (isMounted) setLiveStatus(null);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-header">
          <span className="logo-icon">🧠</span>
          <div className="brand-info">
            <span className="brand-title">MindLedger</span>
            <span className="brand-subtitle">Digital Wellbeing</span>
          </div>
        </div>

        <ul className="nav-menu">
          {NAV_ITEMS.map((item) => (
            <li
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
            >
              <button onClick={() => onSelectSection(item.id)}>
                <span className="nav-icon">{item.icon}</span> {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        <div className="tracking-status-card">
          <div className="status-header">
            <span
              className={`status-dot ${
                liveStatus && liveStatus.is_tracking ? '' : 'idle'
              }`}
            ></span>
            <span>
              {liveStatus && liveStatus.is_tracking ? 'Active' : 'Standby'}
            </span>
          </div>
          <div className="current-app-title">
            {liveStatus?.current_app || 'MindLedger Active'}
          </div>
          <div className="current-session-duration">
            {liveStatus
              ? `${secondsToHms(liveStatus.duration_seconds)} this session`
              : 'Monitoring window changes'}
          </div>
        </div>
      </div>
    </aside>
  );
}
