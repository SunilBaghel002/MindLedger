import React, { useEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiBell,
  FiCheckCircle,
  FiClock,
  FiCoffee,
  FiCompass,
  FiDroplet,
  FiHeart,
  FiInfo,
  FiLayers,
  FiMoon,
  FiPauseCircle,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSliders,
  FiSun,
  FiTrash2,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import StatCard from '../components/StatCard';
import Toast from '../components/Toast';
import WaterReminderOverlay from '../components/WaterReminderOverlay';
import { api } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

export default function HydrationPage() {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const overlayShownRef = useRef(false);

  // Config State
  const [config, setConfig] = useState({
    enabled: true,
    mode: 'smart',
    custom_interval_minutes: 45,
    daily_goal_ml: 2000,
  });

  const isFetchingRef = useRef(false);

  const addToast = (type, message, title = '') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchData = async (force = false) => {
    if (!force && (isFetchingRef.current || document.hidden)) return;
    isFetchingRef.current = true;

    try {
      const [statusRes, historyRes, logsRes] = await Promise.all([
        api.getWaterStatus(),
        api.getWaterHistory(7),
        api.getWaterLogs(),
      ]);

      if (statusRes) {
        setStatus(statusRes);
        setConfig({
          enabled: statusRes.enabled ?? true,
          mode: statusRes.mode || 'smart',
          custom_interval_minutes: statusRes.custom_interval_minutes || 45,
          daily_goal_ml: statusRes.daily_goal_ml || 2000,
        });
      }
      if (historyRes) setHistory(historyRes);
      if (logsRes?.logs) setLogs(logsRes.logs);
    } catch (err) {
      console.warn('Hydration fetch error:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 5000);

    const handleVisibility = () => {
      if (!document.hidden) fetchData(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleDrinkWater = async (amount = 250, source = 'dashboard_widget') => {
    // 1. Instant Optimistic UI Update
    const nowIso = new Date().toISOString();
    const newLogItem = {
      id: Date.now(),
      timestamp: nowIso,
      amount_ml: amount,
      source: source || 'dashboard_widget',
      daily_goal_ml: status?.daily_goal_ml || 2000,
    };

    setStatus((prev) => {
      const curIntake = (prev?.today_intake_ml || 0) + amount;
      const curGoal = prev?.daily_goal_ml || 2000;
      const curGlasses = Math.floor(curIntake / 250);
      return {
        ...prev,
        today_intake_ml: curIntake,
        glasses_drank: curGlasses,
        percentage_completed: Math.min(100, Math.round((curIntake / curGoal) * 100)),
        last_drank_at: nowIso,
      };
    });

    setLogs((prev) => [newLogItem, ...prev]);

    setLogging(true);
    try {
      const res = await api.logWaterDrink(amount, source || 'dashboard_widget');
      addToast(
        'success',
        `Logged +${amount} ml of water! Today's Total: ${res.today_intake_ml} ml (${res.glasses_drank} glasses).`,
        'Hydration Recorded 💧'
      );
      // Authoritative sync
      fetchData(true);
    } catch (err) {
      addToast('danger', err.message || 'Failed to record drink', 'Logging Error');
      fetchData(true);
    } finally {
      setLogging(false);
    }
  };

  const handleSnooze = async (mins = 10) => {
    try {
      const res = await api.snoozeWater(mins);
      addToast(
        'info',
        `Hydration reminder snoozed by ${mins} minutes. Next nudge at ~${res.next_reminder_formatted}.`,
        'Reminder Snoozed'
      );
      fetchData(true);
    } catch (err) {
      addToast('danger', err.message || 'Failed to snooze reminder', 'Action Error');
    }
  };

  const handleTestNotification = () => {
    setIsTestMode(true);
    setShowOverlay(true);
  };

  const handleOverlayDrink = async () => {
    await handleDrinkWater(250, 'notification_button');
  };

  const handleOverlayRemindLater = async () => {
    if (isTestMode) {
      addToast(
        'info',
        `Hydration companion dismissed. Your next scheduled reminder remains at ~${nextReminder}.`,
        'Test Dismissed'
      );
    } else {
      await handleSnooze(10);
    }
  };

  // Auto-show overlay when reminder is due (polled from status)
  useEffect(() => {
    if (status?.reminder_due && !overlayShownRef.current) {
      overlayShownRef.current = true;
      setIsTestMode(false);
      setShowOverlay(true);
    }
    if (!status?.reminder_due) {
      overlayShownRef.current = false;
    }
  }, [status?.reminder_due]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await api.updateWaterConfig(config);
      if (res) {
        setStatus(res);
        addToast('success', 'Hydration preferences and daily goals saved successfully!', 'Preferences Saved');
        fetchData(true);
      }
    } catch (err) {
      addToast('danger', err.message || 'Failed to save configuration', 'Error');
    } finally {
      setSavingConfig(false);
    }
  };

  const todayIntake = status?.today_intake_ml || 0;
  const dailyGoal = status?.daily_goal_ml || 2000;
  const glassesDrank = status?.glasses_drank || Math.floor(todayIntake / 250);
  const targetGlasses = status?.target_glasses || Math.ceil(dailyGoal / 250);
  const pctCompleted = status?.percentage_completed || Math.min(100, Math.round((todayIntake / dailyGoal) * 100));
  const nextReminder = status?.next_reminder_formatted || '45m';

  // 7-Day History Chart Config
  const historyList = history?.history || [];
  const chartLabels = historyList.map((h) => {
    try {
      const d = new Date(h.date);
      return d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
    } catch {
      return h.date;
    }
  });
  const chartIntake = historyList.map((h) => h.total_ml);

  const barChartData = {
    labels: chartLabels.length > 0 ? chartLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
    datasets: [
      {
        label: 'Intake (ml)',
        data: chartIntake.length > 0 ? chartIntake : [1500, 1750, 2000, 1250, 2250, 1500, todayIntake || 1250],
        backgroundColor: chartIntake.map((ml) => (ml >= dailyGoal ? '#10B981' : '#3B82F6')),
        borderRadius: 8,
        barThickness: 24,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        suggestedMax: 2500,
        grid: { color: '#F1F5F9' },
        ticks: {
          callback: (value) => `${value} ml`,
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#94A3B8',
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#94A3B8',
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { family: "'Inter', sans-serif", size: 12, weight: 'bold' },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` Water Drank: ${ctx.raw} ml (${Math.round(ctx.raw / 250)} glasses)`,
        },
      },
    },
  };

  return (
    <>
    <section className="page-section" style={{ paddingBottom: 'var(--space-2xl)' }}>
      {/* Toast Notification Container */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Top Banner (Unified Header) */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-lg)',
          background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
          borderLeft: '4px solid #3B82F6',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-blue">Smart Hydration Engine</span>
              <span className="badge badge-emerald">Active Work-Time Aware</span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
              Smart Hydration & Wellness System
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Adaptive active-screen reminders, sleep/idle state resilience, 1-click water logging, and native desktop push alerts.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleDrinkWater(250, 'dashboard_widget')}
              disabled={logging}
              className="btn btn-primary"
              style={{
                backgroundColor: '#3B82F6',
                borderColor: '#3B82F6',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
              }}
            >
              <FiDroplet /> Drink Glass (+250 ml)
            </button>
            <button
              onClick={handleTestNotification}
              className="btn btn-secondary"
              style={{ fontSize: '13px', fontWeight: 600, padding: '9px 16px', borderRadius: '10px' }}
              title="Test Windows Desktop Toast Notification"
            >
              <FiBell /> Test Alert
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Stat Cards (Unified Grid) */}
      <div className="grid-3">
        <StatCard
          label="Today's Water Intake"
          icon={<FiDroplet />}
          value={`${todayIntake.toLocaleString()} ml`}
          subtext={`${glassesDrank} of ${targetGlasses} glasses consumed today`}
          isPositive={pctCompleted >= 50}
          accentColor={pctCompleted >= 100 ? 'emerald' : 'blue'}
          badgeText={`${pctCompleted}% of Goal`}
        />
        <StatCard
          label="Next Hydration Nudge"
          icon={<FiClock />}
          value={`~${nextReminder}`}
          subtext={config.mode === 'smart' ? 'Adaptive based on coding intensity' : `Custom Interval (${config.custom_interval_minutes}m)`}
          isPositive={true}
          accentColor="cyan"
          badgeText={config.mode === 'smart' ? 'Smart Adaptive' : 'Custom Timer'}
        />
        <StatCard
          label="Daily Target Goal"
          icon={<FiHeart />}
          value={`${dailyGoal.toLocaleString()} ml`}
          subtext={todayIntake >= dailyGoal ? '🎉 Daily hydration goal achieved!' : `Remaining: ${(dailyGoal - todayIntake).toLocaleString()} ml (${Math.max(0, targetGlasses - glassesDrank)} glasses)`}
          isPositive={todayIntake >= dailyGoal}
          accentColor={todayIntake >= dailyGoal ? 'emerald' : 'rose'}
          badgeText={todayIntake >= dailyGoal ? 'Goal Met' : `${targetGlasses} Glasses Target`}
        />
      </div>

      {/* Interactive Hydration Station Card */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)', borderRadius: 'var(--radius-md)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#EFF6FF', color: '#3B82F6' }}>
              <FiDroplet />
            </span>
            <span>Interactive 1-Click Drink Station</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Click any glass to log instantly
          </span>
        </div>

        {/* Visual Water Glasses Progress Row */}
        <div
          style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
              Daily Progress: {glassesDrank} / {targetGlasses} Glasses
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#3B82F6' }}>
              {todayIntake} / {dailyGoal} ml ({pctCompleted}%)
            </span>
          </div>

          {/* Glasses Grid */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {Array.from({ length: Math.max(8, targetGlasses) }).map((_, idx) => {
              const isFilled = idx < glassesDrank;
              return (
                <button
                  key={idx}
                  onClick={() => handleDrinkWater(250, 'dashboard_widget')}
                  style={{
                    width: '46px',
                    height: '56px',
                    borderRadius: '10px',
                    border: isFilled ? '2px solid #3B82F6' : '2px dashed #CBD5E1',
                    backgroundColor: isFilled ? '#DBEAFE' : '#FFFFFF',
                    color: isFilled ? '#1D4ED8' : '#94A3B8',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isFilled ? '0 2px 8px rgba(59, 130, 246, 0.2)' : 'none',
                  }}
                  title={`Glass #${idx + 1} (250 ml)`}
                >
                  <FiDroplet style={{ fontSize: '20px' }} />
                  <span style={{ fontSize: '10px', fontWeight: 800, marginTop: '2px' }}>
                    #{idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Action Drink Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleDrinkWater(250, 'dashboard_widget')}
            disabled={logging}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #BFDBFE',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FiDroplet /> +250 ml (Standard Glass)
          </button>
          <button
            onClick={() => handleDrinkWater(500, 'dashboard_widget')}
            disabled={logging}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #A7F3D0',
              backgroundColor: '#ECFDF5',
              color: '#047857',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FiDroplet /> +500 ml (Water Bottle)
          </button>
          <button
            onClick={() => handleDrinkWater(150, 'dashboard_widget')}
            disabled={logging}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #FED7AA',
              backgroundColor: '#FFF7ED',
              color: '#C2410C',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FiCoffee /> +150 ml (Tea / Beverage)
          </button>
          <button
            onClick={() => handleSnooze(10)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FiClock /> Snooze 10m
          </button>
        </div>
      </div>

      {/* Grid: 7-Day Trend Chart & Detailed Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: 'var(--space-xl)' }}>
        {/* 7-Day History Chart Card */}
        <div className="card" style={{ borderRadius: 'var(--radius-md)' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiTrendingUp style={{ color: '#10B981', fontSize: '18px' }} />
              <span>7-Day Hydration History</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Daily Totals (ml)</span>
          </div>
          <div style={{ height: '220px', position: 'relative' }}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Today's Intake Log Table Card */}
        <div className="card" style={{ borderRadius: 'var(--radius-md)', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiClock style={{ color: '#3B82F6' }} />
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Today's Drink Logs</h3>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{logs.length} Entries</span>
          </div>

          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94A3B8' }}>
                <FiDroplet style={{ fontSize: '24px', marginBottom: '6px', color: '#CBD5E1' }} />
                <div style={{ fontSize: '13px' }}>No water logged yet today. Click a glass above to start!</div>
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%', margin: 0 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px' }}>Time</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px' }}>Amount</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px' }}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    let timeFormatted = log.timestamp;
                    try {
                      const d = new Date(log.timestamp);
                      timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } catch {}
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {timeFormatted}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 700, color: '#047857' }}>
                          +{log.amount_ml} ml
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <span className="badge-pill" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: '10px' }}>
                            {log.source || 'widget'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Smart Hydration Settings & Goal Preferences Card */}
      <div className="card" style={{ borderRadius: 'var(--radius-md)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiSliders style={{ color: '#3B82F6' }} />
            <span>Smart Hydration Preferences & Goal Configuration</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Active-Time State Engine</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          {/* Reminder Active Toggle */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: 'var(--text-main)' }}>
              Hydration Reminders Status
            </label>
            <button
              onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: config.enabled ? '#ECFDF5' : '#F1F5F9',
                color: config.enabled ? '#047857' : '#64748B',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{config.enabled ? '💧 Reminders Active' : '⏸ Reminders Paused'}</span>
              <span style={{ fontSize: '11px', fontWeight: 800 }}>{config.enabled ? 'ON' : 'OFF'}</span>
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Counts active keyboard/mouse time and pauses during sleep/idle.
            </span>
          </div>

          {/* Operational Mode Selector */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: 'var(--text-main)' }}>
              Operational Mode
            </label>
            <select
              value={config.mode}
              onChange={(e) => setConfig((p) => ({ ...p, mode: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <option value="smart">Smart Adaptive (Auto-adjusts 45m-65m by coding load)</option>
              <option value="custom">Custom Fixed Interval</option>
            </select>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Smart mode tightens interval during deep coding and relaxes during media.
            </span>
          </div>

          {/* Custom Interval Minutes */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: 'var(--text-main)' }}>
              Reminder Interval (Minutes)
            </label>
            <select
              value={config.custom_interval_minutes}
              onChange={(e) => setConfig((p) => ({ ...p, custom_interval_minutes: parseInt(e.target.value) || 45 }))}
              disabled={config.mode === 'smart'}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: config.mode === 'smart' ? '#F1F5F9' : 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <option value={30}>Every 30 Minutes</option>
              <option value={45}>Every 45 Minutes (Recommended)</option>
              <option value={60}>Every 60 Minutes (1 Hour)</option>
              <option value={90}>Every 90 Minutes (1.5 Hours)</option>
              <option value={120}>Every 120 Minutes (2 Hours)</option>
            </select>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              {config.mode === 'smart' ? 'Locked in Smart Adaptive Mode' : 'Custom fixed timer'}
            </span>
          </div>

          {/* Daily Goal Intake Target */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: 'var(--text-main)' }}>
              Daily Water Target Goal
            </label>
            <select
              value={config.daily_goal_ml}
              onChange={(e) => setConfig((p) => ({ ...p, daily_goal_ml: parseInt(e.target.value) || 2000 }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <option value={1500}>1,500 ml (6 Glasses)</option>
              <option value={2000}>2,000 ml (8 Glasses - Standard)</option>
              <option value={2500}>2,500 ml (10 Glasses)</option>
              <option value={3000}>3,000 ml (12 Glasses - Active)</option>
            </select>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Recommended daily baseline is 2,000 ml (8 glasses).
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="btn btn-primary"
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              backgroundColor: '#3B82F6',
              borderColor: '#3B82F6',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FiSave /> {savingConfig ? 'Saving...' : 'Save Hydration Preferences'}
          </button>
        </div>
      </div>
    </section>

    <WaterReminderOverlay
      visible={showOverlay}
      onDrinkWater={handleOverlayDrink}
      onRemindLater={handleOverlayRemindLater}
      onDismiss={() => setShowOverlay(false)}
    />
    </>
  );
}
