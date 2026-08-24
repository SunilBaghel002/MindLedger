import React, { useEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBattery,
  FiBatteryCharging,
  FiClock,
  FiCpu,
  FiDroplet,
  FiZap,
} from 'react-icons/fi';
import { api } from '../services/api';
import { secondsToHms } from '../utils/formatters';

export default function TopBar() {
  const [vitals, setVitals] = useState(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();

    const fetchVitals = async () => {
      if (isFetchingRef.current || document.hidden) return;
      isFetchingRef.current = true;
      try {
        const data = await api.getVitals({ signal: abortController.signal });
        if (isMounted) {
          setVitals(data);
        }
      } catch (e) {
        if (isMounted && e.name !== 'AbortError') {
          // Keep prior vitals if transient network hiccup
        }
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchVitals();
    const interval = setInterval(fetchVitals, 3000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchVitals();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      abortController.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const isTracking = vitals?.is_tracking ?? true;
  const currentApp = vitals?.current_app || 'MindLedger Active';
  const battery = vitals?.battery;
  const memory = vitals?.memory;
  const hydration = vitals?.hydration;
  const limitWarnings = vitals?.limits_warning || [];

  return (
    <div className="topbar-vitals-container">
      <div className="topbar-left">
        {/* Tracking Live Status Pill */}
        <div className={`vital-pill tracking-pill ${isTracking ? 'active' : 'standby'}`}>
          <span className={`pulse-dot ${isTracking ? 'emerald' : 'amber'}`}></span>
          <span className="vital-label-highlight">
            {isTracking ? 'Live Tracking' : 'Standby'}
          </span>
          <span className="vital-separator">•</span>
          <span className="vital-app-name" title={currentApp}>
            {currentApp}
          </span>
        </div>

        {/* Screen Time Today Quick Counter */}
        {vitals?.screen_time_today_seconds !== undefined && vitals.screen_time_today_seconds > 0 && (
          <div className="vital-pill time-pill" title="Today's Total Screen Time">
            <FiClock className="vital-icon text-blue" />
            <span>{secondsToHms(vitals.screen_time_today_seconds)}</span>
          </div>
        )}
      </div>

      <div className="topbar-right">
        {/* Memory Load */}
        {memory && memory.total_gb > 0 && (
          <div
            className="vital-pill memory-pill"
            title={`RAM Load: ${memory.percent}% (${memory.used_gb} GB of ${memory.total_gb} GB)`}
          >
            <FiCpu className="vital-icon text-purple" />
            <span>
              {memory.used_gb} / {memory.total_gb} GB
            </span>
          </div>
        )}

        {/* Battery Telemetry */}
        {battery && (
          <div
            className={`vital-pill battery-pill ${battery.is_charging ? 'charging' : ''}`}
            title={`Battery: ${battery.percent}% (${battery.status_text})`}
          >
            {battery.is_charging ? (
              <FiBatteryCharging className="vital-icon text-emerald" />
            ) : (
              <FiBattery
                className={`vital-icon ${
                  (battery.percent ?? 100) < 20
                    ? 'text-rose'
                    : (battery.percent ?? 100) < 45
                    ? 'text-amber'
                    : 'text-emerald'
                }`}
              />
            )}
            <span>{battery.percent}%</span>
            {battery.discharge_rate_hr ? (
              <span className="vital-subtext">(-{battery.discharge_rate_hr}%/h)</span>
            ) : null}
          </div>
        )}

        {/* Hydration Widget */}
        {hydration && (
          <div
            className="vital-pill hydration-pill"
            title={`Hydration: ${hydration.count}/${hydration.goal} Glasses logged today. Next reminder in ${hydration.next_reminder_minutes}m`}
          >
            <FiDroplet className="vital-icon text-cyan" />
            <span>
              {hydration.count}/{hydration.goal}
            </span>
          </div>
        )}

        {/* Limit Warning (if approaching quota) */}
        {limitWarnings.length > 0 && (
          <div className="vital-pill limit-warning-pill" title="Active Limit Alert">
            <FiAlertTriangle className="vital-icon text-rose" />
            <span>
              {limitWarnings[0].target_name} ({Math.round(limitWarnings[0].percent_used)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
