import React, { useEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiCpu,
  FiExternalLink,
  FiFilter,
  FiGrid,
  FiHelpCircle,
  FiInfo,
  FiLayers,
  FiList,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiSliders,
  FiTrash2,
  FiTrendingUp,
  FiUser,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import Toast from '../components/Toast';
import { api } from '../services/api';
import { secondsToHms } from '../utils/formatters';

const FILTER_TABS = [
  { id: 'user', label: 'User Apps', icon: FiUser },
  { id: 'hogs', label: 'Resource Hogs', icon: FiAlertTriangle },
  { id: 'all', label: 'All Processes', icon: FiLayers },
  { id: 'system', label: 'System Protected', icon: FiShield },
];

export default function ProcessesPage() {
  const [filter, setFilter] = useState('user');
  const [sortBy, setSortBy] = useState('memory');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'flat'
  const [expandedApps, setExpandedApps] = useState({});
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [processData, setProcessData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const fetchProcesses = async (showLoading = false) => {
    if (isFetchingRef.current || document.hidden) return;
    if (showLoading && !processData) setIsLoading(true);
    isFetchingRef.current = true;

    try {
      const data = await api.getProcesses(filter, sortBy);
      setProcessData(data);
      setError(null);
    } catch (err) {
      console.warn('Process fetch failed:', err);
      if (!processData) {
        setError(err.message || 'Failed to scan active processes');
      }
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchProcesses(true);
    const interval = setInterval(() => {
      fetchProcesses(false);
    }, 8000);

    const handleVisibility = () => {
      if (!document.hidden) fetchProcesses(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [filter, sortBy]);

  const toggleAppExpand = (binaryName) => {
    setExpandedApps((prev) => ({
      ...prev,
      [binaryName]: !prev[binaryName],
    }));
  };

  const handleEndAppPrompt = (app) => {
    setTerminateTarget({
      type: 'app',
      name: app.app_name,
      binary_name: app.binary_name,
      count: app.process_count,
      memory_mb: app.total_memory_mb,
    });
    setIsConfirmOpen(true);
  };

  const handleEndPidPrompt = (proc) => {
    setTerminateTarget({
      type: 'pid',
      name: proc.name,
      pid: proc.pid,
      count: 1,
      memory_mb: proc.memory_mb,
    });
    setIsConfirmOpen(true);
  };

  const handleConfirmTerminate = async () => {
    if (!terminateTarget) return;
    setIsTerminating(true);

    try {
      if (terminateTarget.type === 'app') {
        const res = await api.terminateApp(terminateTarget.binary_name, false);
        addToast(
          'success',
          `Terminated ${res.app_name} (${res.terminated_pids_count} processes) and freed ~${res.memory_freed_mb} MB RAM.`,
          'Application Closed'
        );
      } else {
        const res = await api.terminateProcess(
          terminateTarget.pid,
          terminateTarget.name,
          false
        );
        addToast(
          'success',
          `Terminated process ${res.process_name} (PID: ${res.pid}), freeing ~${res.memory_freed_mb} MB RAM.`,
          'Process Terminated'
        );
      }
      setIsConfirmOpen(false);
      setTerminateTarget(null);
      fetchProcesses(false);
    } catch (err) {
      addToast('danger', err.message || 'Failed to terminate task', 'Action Denied');
    } finally {
      setIsTerminating(false);
    }
  };

  const handleOptimizeHogs = async () => {
    try {
      const res = await api.optimizeProcesses(15.0);
      if (res.optimized_count > 0) {
        addToast(
          'success',
          `Optimized ${res.optimized_count} background hog(s), freeing ~${res.total_memory_freed_mb} MB RAM.`,
          'Optimization Complete'
        );
        fetchProcesses(false);
      } else {
        addToast('info', 'No background resource hogs found to optimize.', 'System Clean');
      }
    } catch (err) {
      addToast('danger', err.message || 'Failed to optimize processes', 'Error');
    }
  };

  const groupedApps = processData?.grouped_apps || [];
  const flatProcesses = processData?.processes || [];

  const filteredGrouped = groupedApps.filter((app) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      app.app_name.toLowerCase().includes(q) ||
      app.binary_name.toLowerCase().includes(q) ||
      (app.description && app.description.toLowerCase().includes(q)) ||
      (app.category && app.category.toLowerCase().includes(q)) ||
      app.pids.some((p) => String(p).includes(q))
    );
  });

  const filteredFlat = flatProcesses.filter((proc) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      proc.name.toLowerCase().includes(q) ||
      (proc.title && proc.title.toLowerCase().includes(q)) ||
      String(proc.pid).includes(q)
    );
  });

  const formatMemory = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  };

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

      {/* Top 3 Stat Cards (Unified SaaS Design Grid) */}
      <div className="grid-3">
        <StatCard
          label="Active Applications"
          icon={<FiLayers />}
          value={`${processData?.grouped_apps?.length || 0} Apps`}
          subtext={`${processData?.total_processes || 0} active worker PIDs`}
          isPositive={true}
          accentColor="blue"
          badgeText="Real-Time"
        />
        <StatCard
          label="RAM Footprint"
          icon={<FiCpu />}
          value={formatMemory(processData?.total_ram_used_mb || 0)}
          subtext="Active system memory in use"
          isPositive={true}
          accentColor="emerald"
          badgeText="Active Memory"
        />
        <StatCard
          label="Resource Hogs"
          icon={<FiZap />}
          value={processData?.hog_count || 0}
          subtext={
            processData?.hog_count > 0
              ? 'Heavy background processes detected'
              : 'Zero background resource hogs'
          }
          isPositive={processData?.hog_count === 0}
          accentColor={processData?.hog_count > 0 ? 'rose' : 'emerald'}
          badgeText={processData?.hog_count > 0 ? 'Action Needed' : 'Optimized'}
        />
      </div>

      {/* Unified Controls & Filter Toolbar */}
      <div className="proc-toolbar">
        {/* Filter Pills */}
        <div className="proc-filter-group">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`proc-filter-pill ${active ? 'active' : ''}`}
              >
                <Icon style={{ fontSize: '13px' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* View Switcher, Search, and Sort Cluster */}
        <div className="proc-controls-cluster">
          {/* View Mode Toggle */}
          <div className="proc-view-toggle">
            <button
              onClick={() => setViewMode('grouped')}
              className={`proc-view-btn ${viewMode === 'grouped' ? 'active' : ''}`}
              title="Group by parent application"
            >
              <FiGrid style={{ fontSize: '13px' }} />
              <span>Grouped</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`proc-view-btn ${viewMode === 'flat' ? 'active' : ''}`}
              title="View all individual process PIDs"
            >
              <FiList style={{ fontSize: '13px' }} />
              <span>Flat PIDs</span>
            </button>
          </div>

          {/* Search Box with Clear Button */}
          <div className="proc-search-wrapper">
            <span className="proc-search-icon">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Search apps or PIDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="proc-search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="proc-search-clear"
                title="Clear search"
              >
                <FiX size={13} />
              </button>
            )}
          </div>

          {/* Styled Sort Dropdown */}
          <div className="proc-sort-wrapper">
            <span className="proc-sort-icon">
              <FiSliders />
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="proc-sort-select"
            >
              <option value="memory">RAM Memory (MB)</option>
              <option value="cpu">CPU Usage (%)</option>
              <option value="hog_score">Resource Hog Score</option>
              <option value="name">App Name</option>
            </select>
            <span className="proc-sort-chevron">
              <FiChevronDown />
            </span>
          </div>

          {/* Clean Up Hogs Action Button */}
          {processData?.hog_count > 0 && (
            <button
              onClick={handleOptimizeHogs}
              className="proc-cleanup-btn"
              title="Clean up background resource hogs"
            >
              <FiTrash2 size={13} />
              <span>Clean Up ({processData.hog_count})</span>
            </button>
          )}
        </div>
      </div>

      {/* Explanatory System Architecture Card */}
      {showInfoBanner && (
        <div
          className="card"
          style={{
            padding: '16px 20px',
            marginBottom: 'var(--space-xl)',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
            border: '1px solid #DBEAFE',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#DBEAFE',
                color: '#2563EB',
                fontSize: '18px',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <FiHelpCircle />
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.55 }}>
              <div style={{ fontWeight: 800, color: '#1E3A8A', marginBottom: '3px', fontSize: '13px' }}>
                Why do Chrome & Antigravity IDE show multiple sub-processes?
              </div>
              <div style={{ color: '#3B82F6', marginBottom: '6px' }}>
                <strong>Multi-Process Sandboxing:</strong> Modern browsers and IDEs isolate each tab, extension, GPU engine, and code intelligence worker into separate processes for crash resilience. MindLedger automatically groups them below so you can inspect or terminate them as a single app.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', color: '#475569', fontSize: '11px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  🛡️ <strong>MsMpEng.exe:</strong> Windows Defender Antivirus
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  ⚡ <strong>MemCompression:</strong> Windows Kernel RAM Optimizer
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  💡 <strong>language_server:</strong> IDE Syntax & Type Engine
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowInfoBanner(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: '6px',
            }}
            title="Dismiss guide"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Process List / Cards View */}
      {isLoading ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <FiRefreshCw className="spin" style={{ fontSize: '32px', color: 'var(--primary-500)', marginBottom: '12px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Scanning background processes and resource telemetry...
          </p>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center', backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }}>
          <FiAlertCircle style={{ fontSize: '32px', color: '#E11D48', marginBottom: '8px' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#9F1239' }}>Process Scanner Error</h3>
          <p style={{ fontSize: '12px', color: '#BE123C', marginTop: '4px' }}>{error}</p>
        </div>
      ) : viewMode === 'grouped' ? (
        /* GROUPED APPLICATION CARDS VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredGrouped.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <FiLayers style={{ fontSize: '32px', color: 'var(--text-muted)', marginBottom: '8px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                No applications matching current filter.
              </p>
            </div>
          ) : (
            filteredGrouped.map((app) => {
              const isExpanded = !!expandedApps[app.binary_name];
              return (
                <div key={app.binary_name} className={`proc-app-card ${app.is_hog ? 'is-hog' : ''}`}>
                  {/* Parent App Header */}
                  <div className="proc-app-header">
                    {/* Left: App Identity & Description */}
                    <div className="proc-app-left">
                      <button
                        onClick={() => toggleAppExpand(app.binary_name)}
                        className="proc-expand-btn"
                        title={isExpanded ? 'Collapse sub-processes' : 'Expand sub-processes'}
                      >
                        {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                      </button>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="proc-app-meta">
                          <span className="proc-app-name">{app.app_name}</span>
                          <span className="proc-meta-tag">{app.binary_name}</span>
                          <span className="proc-cat-badge">{app.category}</span>
                          {app.process_count > 1 && (
                            <button
                              onClick={() => toggleAppExpand(app.binary_name)}
                              className="proc-count-btn"
                            >
                              {app.process_count} worker processes {isExpanded ? '▲' : '▼'}
                            </button>
                          )}
                          {app.is_hog && (
                            <span className="badge-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                              ⚠️ Resource Hog ({app.hog_score})
                            </span>
                          )}
                          {app.is_protected && (
                            <span className="badge-pill" style={{ backgroundColor: '#F1F5F9', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <FiShield style={{ color: 'var(--emerald-500)' }} />
                              System Protected
                            </span>
                          )}
                        </div>

                        {/* Description / Explanation */}
                        {app.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {app.description}
                          </div>
                        )}

                        {/* Chrome Profiles Tags */}
                        {app.profile_info && app.profile_info.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                              Active Profiles:
                            </span>
                            {app.profile_info.map((prof, idx) => (
                              <span key={idx} className="proc-profile-pill">
                                👤 {prof}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Metrics & Actions */}
                    <div className="proc-app-right">
                      <div className="proc-stat-col">
                        <div className="proc-stat-lbl">RAM Usage</div>
                        <div className="proc-stat-val">{formatMemory(app.total_memory_mb)}</div>
                      </div>

                      <div className="proc-stat-col">
                        <div className="proc-stat-lbl">CPU %</div>
                        <div
                          className="proc-stat-val"
                          style={{
                            color:
                              app.total_cpu_percent > 5.0
                                ? 'var(--rose-600)'
                                : app.total_cpu_percent > 1.0
                                ? 'var(--amber-600)'
                                : 'var(--emerald-600)',
                          }}
                        >
                          {app.total_cpu_percent}%
                        </div>
                      </div>

                      <div>
                        {app.is_protected ? (
                          <div className="btn-protected-badge" title="System protected software cannot be terminated.">
                            <FiShield style={{ color: 'var(--emerald-500)' }} />
                            Protected
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEndAppPrompt(app)}
                            className="btn-end-app"
                          >
                            <FiTrash2 />
                            End App
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Sub-process Children Accordion */}
                  {isExpanded && app.children && app.children.length > 0 && (
                    <div className="proc-children-container">
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Worker Sub-processes ({app.children.length} PIDs):
                      </div>
                      <div className="proc-children-grid">
                        {app.children.map((child) => (
                          <div key={child.pid} className="proc-child-card">
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>
                                  PID: {child.pid}
                                </span>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {child.role}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', marginTop: '2px', fontSize: '11px' }}>
                                <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{formatMemory(child.memory_mb)}</span>
                                <span style={{ color: 'var(--text-muted)' }}>•</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{child.cpu_percent}% CPU</span>
                              </div>
                            </div>

                            {!child.is_protected && (
                              <button
                                onClick={() => handleEndPidPrompt(child)}
                                style={{
                                  padding: '5px 8px',
                                  background: '#FFF1F2',
                                  border: '1px solid #FECDD3',
                                  borderRadius: '6px',
                                  color: '#E11D48',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                                title={`End PID ${child.pid}`}
                              >
                                <FiTrash2 size={12} />
                                End
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* FLAT PID TABLE VIEW (Matching Browser & Applications Tables) */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Process / Window</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>PID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Category</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>RAM</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>CPU %</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlat.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No processes match your search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredFlat.map((proc) => (
                    <tr key={proc.pid}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>{proc.name}</div>
                        {proc.title && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {proc.title}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {proc.pid}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge-pill" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
                          {proc.category || 'general'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {formatMemory(proc.memory_mb)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {proc.cpu_percent}%
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {proc.is_protected ? (
                          <span className="badge-pill" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
                            Protected
                          </span>
                        ) : (
                          <button
                            onClick={() => handleEndPidPrompt(proc)}
                            className="btn btn-sm btn-danger"
                            style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600 }}
                          >
                            <FiTrash2 size={11} /> End
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Confirmation Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => !isTerminating && setIsConfirmOpen(false)}
        size="md"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#FFF1F2', color: '#E11D48', fontSize: '15px' }}>
              <FiAlertTriangle />
            </span>
            <span>
              {terminateTarget?.type === 'app' ? 'End Application Process Tree' : 'Terminate Worker Process'}
            </span>
          </div>
        }
      >
        <div className="modal-end-task-card">
          {/* Target App / Process Overview Card */}
          <div className="modal-app-preview">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#F1F5F9', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#334155' }}>
                <FiLayers />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                  {terminateTarget?.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                  {terminateTarget?.type === 'app' ? terminateTarget?.binary_name : `PID: ${terminateTarget?.pid}`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="modal-stat-pill" title="Memory to be freed">
                <FiCpu style={{ color: '#10B981' }} />
                <span>{formatMemory(terminateTarget?.memory_mb || 0)} RAM</span>
              </div>
              {terminateTarget?.type === 'app' && terminateTarget?.count > 1 && (
                <div className="modal-stat-pill" style={{ background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' }}>
                  <span>{terminateTarget?.count} PIDs</span>
                </div>
              )}
            </div>
          </div>

          {/* Danger Warning Alert */}
          <div className="modal-danger-banner">
            <div className="modal-danger-icon">
              <FiTrash2 />
            </div>
            <div style={{ fontSize: '12px', color: '#881337', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 800, marginBottom: '3px', fontSize: '13px', color: '#9F1239' }}>
                Are you sure you want to end {terminateTarget?.name}?
              </div>
              <div>
                {terminateTarget?.type === 'app'
                  ? `This will immediately terminate all ${terminateTarget?.count} background worker processes, release ~${formatMemory(
                      terminateTarget?.memory_mb || 0
                    )} of RAM, and stop battery consumption. Any unsaved changes in this application will be closed.`
                  : `This will forcefully terminate worker process PID ${terminateTarget?.pid} and release ~${formatMemory(
                      terminateTarget?.memory_mb || 0
                    )} of RAM.`}
              </div>
            </div>
          </div>

          {/* Action Button Footer */}
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
                  Ending Task...
                </>
              ) : (
                <>
                  <FiTrash2 />
                  Yes, End Task
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
