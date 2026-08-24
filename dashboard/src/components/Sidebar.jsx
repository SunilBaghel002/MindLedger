import React, { useEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiBatteryCharging,
  FiCpu,
  FiFileText,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiShield,
  FiSliders,
  FiYoutube,
} from 'react-icons/fi';
import logoImg from '../assets/logo.png';
import { api } from '../services/api';
import { secondsToHms } from '../utils/formatters';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <FiGrid /> },
  { id: 'apps', label: 'Applications', icon: <FiLayers /> },
  { id: 'browser', label: 'Browser', icon: <FiGlobe /> },
  { id: 'youtube', label: 'YouTube', icon: <FiYoutube /> },
  { id: 'processes', label: 'Processes', icon: <FiCpu /> },
  { id: 'battery', label: 'Battery & Power', icon: <FiBatteryCharging /> },
  { id: 'limits', label: 'App Limits', icon: <FiShield /> },
  { id: 'reports', label: 'Reports', icon: <FiFileText /> },
  { id: 'settings', label: 'Settings', icon: <FiSliders /> },
];

export default function Sidebar({ activeSection, onSelectSection }) {
  const [liveStatus, setLiveStatus] = useState(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();

    const fetchLive = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const data = await api.getLiveStatus({ signal: abortController.signal });
        if (isMounted) {
          setLiveStatus(data);
        }
      } catch (e) {
        if (isMounted && e.name !== 'AbortError') {
          // keep previous
        }
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 2000);

    return () => {
      isMounted = false;
      abortController.abort();
      clearInterval(interval);
    };
  }, []);

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-header">
          <img src={logoImg} alt="MindLedger" className="brand-logo-img" />
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
