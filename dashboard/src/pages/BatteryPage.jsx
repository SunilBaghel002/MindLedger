import React, { useEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiBattery,
  FiBatteryCharging,
  FiCheckCircle,
  FiClock,
  FiCpu,
  FiHeart,
  FiInfo,
  FiLayers,
  FiPower,
  FiRefreshCw,
  FiShield,
  FiTrash2,
  FiTrendingDown,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import Toast from '../components/Toast';
import { api } from '../services/api';
import { secondsToHms } from '../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function BatteryPage() {
  const [status, setStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [drainers, setDrainers] = useState([]);
  const [history, setHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [terminateTarget, setTerminateTarget] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [toasts, setToasts] = useState([]);

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

  const fetchBatteryData = async () => {
    if (isFetchingRef.current || document.hidden) return;
    isFetchingRef.current = true;

    try {
      const [statusRes, healthRes, drainersRes, historyRes] = await Promise.all([
        api.getBatteryStatus(),
        api.getBatteryHealth(),
        api.getBatteryDrainers(10),
        api.getBatteryHistory(),
      ]);

      setStatus(statusRes);
      setHealth(healthRes);
      setDrainers(drainersRes?.drainers || []);
      setHistory(historyRes);
    } catch (err) {
      console.warn('Battery data fetch error:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchBatteryData();
    const interval = setInterval(fetchBatteryData, 6000);

    const handleVisibility = () => {
      if (!document.hidden) fetchBatteryData();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleEndPidPrompt = (proc) => {
    setTerminateTarget({
      name: proc.name,
      pid: proc.pid,
      memory_mb: proc.memory_mb,
      cpu_percent: proc.cpu_percent,
      energy_score: proc.energy_score,
    });
    setIsConfirmOpen(true);
  };

  const handleConfirmTerminate = async () => {
    if (!terminateTarget) return;
    setIsTerminating(true);

    try {
      const res = await api.terminateProcess(
        terminateTarget.pid,
        terminateTarget.name,
        false
      );
      addToast(
        'success',
        `Terminated process ${res.process_name} (PID: ${res.pid}), freeing ~${res.memory_freed_mb} MB RAM and stopping battery drain.`,
        'Power Drain Stopped'
      );
      setIsConfirmOpen(false);
      setTerminateTarget(null);
      fetchBatteryData();
    } catch (err) {
      addToast('danger', err.message || 'Failed to terminate task', 'Action Denied');
    } finally {
      setIsTerminating(false);
    }
  };

  const formatMemory = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  };

  const historyPoints = history?.points || [];
  const chartLabels = historyPoints.map((p) => {
    try {
      const d = new Date(p.timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return p.timestamp;
    }
  });
  const chartData = historyPoints.map((p) => p.percent);

  const lineChartConfig = {
    labels: chartLabels.length > 0 ? chartLabels : ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', 'Now'],
    datasets: [
      {
        label: 'Battery Level (%)',
        data: chartData.length > 0 ? chartData : [95, 88, 75, 68, 62],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: '#F1F5F9' },
        ticks: {
          callback: (value) => `${value}%`,
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
        displayColors: false,
        callbacks: {
          label: (context) => ` Battery Level: ${context.raw}%`,
        },
      },
    },
  };

  const currentPercent = status?.percent ?? 100;
  const isCharging = status?.is_plugged ?? true;
  const dischargeRate = status?.discharge_rate_percent_per_hour;
  const wearPct = health?.wear_level_percent ?? 5.7;
  const healthPct = Math.max(0, Math.min(100, 100 - wearPct));

  const maxEnergyScore = drainers.length > 0 ? Math.max(...drainers.map((d) => d.energy_score || 1)) : 100;

  return (
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

      {/* Top 3 Stat Cards (Unified SaaS Grid) */}
      <div className="grid-3">
        <StatCard
          label="Current Charge Level"
          icon={isCharging ? <FiBatteryCharging /> : <FiBattery />}
          value={`${currentPercent}%`}
          subtext={isCharging ? '⚡ AC Power Connected' : `⏳ ~${status?.time_remaining_formatted || 'calculating...'} left`}
          isPositive={isCharging || currentPercent > 40}
          accentColor={currentPercent > 40 ? 'emerald' : currentPercent > 20 ? 'amber' : 'rose'}
          badgeText={isCharging ? 'Plugged In' : 'On Battery'}
        />
        <StatCard
          label="Discharge Velocity"
          icon={<FiTrendingDown />}
          value={dischargeRate !== null && dischargeRate !== undefined ? `${dischargeRate}%/hr` : '0.0%/hr'}
          subtext="Estimated drain per active work hour"
          isPositive={dischargeRate === 0 || dischargeRate < 15}
          accentColor={dischargeRate > 20 ? 'rose' : dischargeRate > 10 ? 'amber' : 'blue'}
          badgeText="Active Velocity"
        />
        <StatCard
          label="Hardware Health & Wear"
          icon={<FiHeart />}
          value={`${healthPct.toFixed(1)}%`}
          subtext={`Wear: ${wearPct}% (${health?.full_charge_capacity_mwh || 54200} / ${health?.design_capacity_mwh || 57500} mWh)`}
          isPositive={healthPct > 80}
          accentColor={healthPct > 80 ? 'emerald' : 'amber'}
          badgeText={`Wear ${wearPct}%`}
        />
      </div>

      {/* Discharge Curve Line Chart Card */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)', borderRadius: 'var(--radius-md)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiActivity style={{ color: 'var(--emerald-500)', fontSize: '18px' }} />
            <span>Today's Battery Discharge Curve</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Real-time percentage timeline
          </span>
        </div>
        <div style={{ height: '230px', position: 'relative', marginTop: '10px' }}>
          <Line data={lineChartConfig} options={chartOptions} />
        </div>
      </div>

      {/* Energy Drain Leaderboard Card (World-Class Redesigned Table) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FAFAFA',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
              <FiZap />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
                Energy Drain Leaderboard
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                Active processes ranked by real-time hardware energy consumption impact
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge-pill" style={{ backgroundColor: '#F1F5F9', color: '#475569', fontSize: '11px' }}>
              ⚡ Real-Time Scored
            </span>
          </div>
        </div>

        {/* Structured Leaderboard Table */}
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', width: '60px' }}>Rank</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Process / Application</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>PID</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>CPU Usage</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>RAM</th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', width: '220px' }}>Energy Impact Meter</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Impact</th>
                <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', width: '90px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {drainers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <FiRefreshCw className="spin" style={{ fontSize: '24px', color: 'var(--emerald-500)', marginBottom: '8px' }} />
                    <div>Scanning active background energy telemetry...</div>
                  </td>
                </tr>
              ) : (
                drainers.map((item, idx) => {
                  const impact = item.power_impact;
                  const rank = idx + 1;

                  // Rank Badge Styling
                  const rankStyle =
                    rank === 1
                      ? { bg: '#FEF3C7', color: '#B45309', border: '#FCD34D' }
                      : rank === 2
                      ? { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' }
                      : rank === 3
                      ? { bg: '#FFEDD5', color: '#C2410C', border: '#FDBA74' }
                      : { bg: '#F8FAFC', color: '#94A3B8', border: '#E2E8F0' };

                  // Impact Badge Styling
                  const impactBadgeStyle =
                    impact === 'Very High'
                      ? { bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3' }
                      : impact === 'High'
                      ? { bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5' }
                      : impact === 'Moderate'
                      ? { bg: '#FEFCE8', color: '#A16207', border: '#FEF08A' }
                      : { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' };

                  // Meter Color
                  const meterColor =
                    impact === 'Very High'
                      ? 'linear-gradient(90deg, #F43F5E, #E11D48)'
                      : impact === 'High'
                      ? 'linear-gradient(90deg, #FB923C, #F97316)'
                      : impact === 'Moderate'
                      ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                      : 'linear-gradient(90deg, #34D399, #10B981)';

                  const isProtected = ['explorer.exe', 'dwm.exe', 'svchost.exe', 'csrss.exe', 'services.exe', 'lsass.exe'].includes(item.name.toLowerCase());
                  const fillPct = Math.min(100, Math.max(8, (item.energy_score / (maxEnergyScore || 1)) * 100));

                  return (
                    <tr
                      key={item.pid}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease',
                      }}
                      className="table-row-hover"
                    >
                      {/* Rank */}
                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            backgroundColor: rankStyle.bg,
                            color: rankStyle.color,
                            border: `1px solid ${rankStyle.border}`,
                            fontSize: '11px',
                            fontWeight: 800,
                          }}
                        >
                          #{rank}
                        </span>
                      </td>

                      {/* Process Name */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#6366F1', fontSize: '15px' }}>
                            <FiLayers />
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                            {item.name}
                          </span>
                          {isProtected && (
                            <span title="System Protected" style={{ color: 'var(--emerald-500)', display: 'flex', alignItems: 'center' }}>
                              <FiShield size={13} />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PID */}
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {item.pid}
                      </td>

                      {/* CPU Usage */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        <span
                          style={{
                            color:
                              item.cpu_percent > 50
                                ? '#E11D48'
                                : item.cpu_percent > 15
                                ? '#D97706'
                                : 'var(--text-main)',
                          }}
                        >
                          {item.cpu_percent}%
                        </span>
                      </td>

                      {/* RAM Usage */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {formatMemory(item.memory_mb)}
                      </td>

                      {/* Energy Score Meter */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '7px',
                              backgroundColor: '#E2E8F0',
                              borderRadius: '9999px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${fillPct}%`,
                                height: '100%',
                                background: meterColor,
                                borderRadius: '9999px',
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--text-secondary)',
                              minWidth: '38px',
                              textAlign: 'right',
                            }}
                          >
                            {Math.round(item.energy_score)}
                          </span>
                        </div>
                      </td>

                      {/* Severity Impact */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: impactBadgeStyle.bg,
                            color: impactBadgeStyle.color,
                            border: `1px solid ${impactBadgeStyle.border}`,
                            fontSize: '11px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {impact}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        {isProtected ? (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#94A3B8',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <FiShield size={11} /> Protected
                          </span>
                        ) : (
                          <button
                            onClick={() => handleEndPidPrompt(item)}
                            className="btn-end-app"
                            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                            title={`End task PID ${item.pid} to save battery`}
                          >
                            <FiTrash2 size={11} /> End
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Centered End-Task Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => !isTerminating && setIsConfirmOpen(false)}
        size="md"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#FFF1F2', color: '#E11D48', fontSize: '15px' }}>
              <FiZap />
            </span>
            <span>Stop Battery Drain Task</span>
          </div>
        }
      >
        <div className="modal-end-task-card">
          <div className="modal-app-preview">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#FEF3C7', border: '1px solid #FCD34D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#D97706' }}>
                <FiZap />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                  {terminateTarget?.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                  PID: {terminateTarget?.pid}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="modal-stat-pill" title="Memory to be freed">
                <FiCpu style={{ color: '#10B981' }} />
                <span>{formatMemory(terminateTarget?.memory_mb || 0)} RAM</span>
              </div>
              <div className="modal-stat-pill" style={{ background: '#FFF1F2', color: '#E11D48', borderColor: '#FECDD3' }}>
                <span>{terminateTarget?.cpu_percent}% CPU</span>
              </div>
            </div>
          </div>

          <div className="modal-danger-banner">
            <div className="modal-danger-icon">
              <FiTrash2 />
            </div>
            <div style={{ fontSize: '12px', color: '#881337', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 800, marginBottom: '3px', fontSize: '13px', color: '#9F1239' }}>
                Stop {terminateTarget?.name} from draining battery?
              </div>
              <div>
                This process has an Energy Impact Score of <strong>{Math.round(terminateTarget?.energy_score || 0)}</strong>. Terminating it will instantly stop CPU power draw and free ~{formatMemory(terminateTarget?.memory_mb || 0)} of RAM.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '6px' }}>
            <button
              onClick={() => setIsConfirmOpen(false)}
              className="btn btn-secondary"
              style={{ fontSize: '13px', padding: '9px 18px', borderRadius: '10px', fontWeight: 600 }}
              disabled={isTerminating}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmTerminate}
              className="btn btn-danger"
              style={{
                backgroundColor: '#E11D48',
                borderColor: '#E11D48',
                color: '#FFFFFF',
                fontSize: '13px',
                padding: '9px 20px',
                borderRadius: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
                cursor: isTerminating ? 'not-allowed' : 'pointer',
              }}
              disabled={isTerminating}
            >
              {isTerminating ? (
                <>
                  <FiRefreshCw className="spin" />
                  Stopping Task...
                </>
              ) : (
                <>
                  <FiTrash2 />
                  End Task & Save Power
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
