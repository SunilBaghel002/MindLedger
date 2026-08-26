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
  FiTrash2,
  FiUser,
  FiZap,
} from 'react-icons/fi';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { api } from '../services/api';

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
    <div style={{ paddingBottom: '48px' }}>
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

      {/* Top Banner & Stats Overview */}
      <div className="proc-hero-banner">
        <div style={{ maxWidth: '620px' }}>
          <div className="proc-hero-tag">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34D399', display: 'inline-block' }} />
            Active Real-Time Process Supervisor
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
            Background Process Manager & Resource Optimizer
          </h1>
          <p style={{ fontSize: '13px', color: '#CBD5E1', margin: 0, lineHeight: 1.5 }}>
            Grouped application trees, multi-process Chromium & IDE inspectors, and safe task termination for optimized battery & RAM.
          </p>
        </div>

        <div className="proc-stat-grid">
          <div className="proc-stat-chip">
            <div className="proc-stat-chip-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818CF8' }}>
              <FiLayers />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Applications</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                {processData?.grouped_apps?.length || 0}{' '}
                <span style={{ fontSize: '11px', fontWeight: 400, color: '#94A3B8' }}>
                  ({processData?.total_processes || 0} PIDs)
                </span>
              </div>
            </div>
          </div>

          <div className="proc-stat-chip">
            <div className="proc-stat-chip-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24' }}>
              <FiZap />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Resource Hogs</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#FCD34D' }}>
                {processData?.hog_count || 0}
              </div>
            </div>
          </div>

          <div className="proc-stat-chip">
            <div className="proc-stat-chip-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34D399' }}>
              <FiCpu />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>RAM In Use</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#6EE7B7' }}>
                {formatMemory(processData?.total_ram_used_mb || 0)}
              </div>
            </div>
          </div>

          {processData?.hog_count > 0 && (
            <button
              onClick={handleOptimizeHogs}
              className="btn-end-app"
              style={{ background: '#F59E0B', borderColor: '#F59E0B', color: '#0F172A', padding: '10px 18px', fontWeight: 800 }}
            >
              <FiTrash2 />
              Clean Up Hogs ({processData.hog_count})
            </button>
          )}
        </div>
      </div>

      {/* Explanatory Task Guide Banner */}
      {showInfoBanner && (
        <div className="proc-info-box">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ padding: '6px', backgroundColor: '#E0E7FF', color: '#4F46E5', borderRadius: '8px', marginTop: '2px' }}>
              <FiHelpCircle size={18} />
            </div>
            <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
              <div style={{ fontWeight: 700, color: '#1E1B4B', marginBottom: '2px', fontSize: '13px' }}>
                Why do Chrome & Antigravity IDE show multiple processes?
              </div>
              <div style={{ color: '#4338CA' }}>
                <strong>Multi-process Sandboxing:</strong> Modern browsers and IDEs isolate each tab, extension, GPU engine, and code intelligence worker into separate processes for crash resilience. MindLedger groups them below so you can inspect or terminate them as a single app.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '6px', color: '#475569', fontSize: '11px' }}>
                <span>🛡️ <strong>MsMpEng.exe:</strong> Windows Defender Antivirus engine</span>
                <span>⚡ <strong>MemCompression:</strong> Windows kernel RAM optimizer</span>
                <span>💡 <strong>language_server:</strong> IDE code intelligence & syntax engine</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowInfoBanner(false)}
            style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        {/* Filter Tabs */}
        <div className="filter-pills" style={{ margin: 0 }}>
          {[
            { id: 'user', label: 'User Apps', icon: FiUser },
            { id: 'hogs', label: 'Resource Hogs', icon: FiAlertTriangle },
            { id: 'all', label: 'All Processes', icon: FiLayers },
            { id: 'system', label: 'System Protected', icon: FiShield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`filter-pill ${active ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                <Icon style={{ marginRight: '6px' }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* View Mode & Search & Sorting */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setViewMode('grouped')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'grouped' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'grouped' ? 'var(--primary-600)' : 'var(--text-secondary)',
                boxShadow: viewMode === 'grouped' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <FiGrid />
              Grouped
            </button>
            <button
              onClick={() => setViewMode('flat')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'flat' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'flat' ? 'var(--primary-600)' : 'var(--text-secondary)',
                boxShadow: viewMode === 'flat' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <FiList />
              Flat PIDs
            </button>
          </div>

          {/* Search Box */}
          <div className="search-box" style={{ width: '220px', margin: 0 }}>
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search applications or PIDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '6px 12px 6px 32px', fontSize: '12px', borderRadius: '8px' }}
            />
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontWeight: 600,
              }}
            >
              <option value="memory">RAM Memory (MB)</option>
              <option value="cpu">CPU Usage (%)</option>
              <option value="hog_score">Hog Score</option>
              <option value="name">App Name</option>
            </select>
          </div>
        </div>
      </div>

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
        <div>
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
                            <span className="badge-pill badge-neutral" style={{ fontSize: '11px', padding: '2px 8px' }}>
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

                      <div className="proc-stat-col" style={{ display: 'none', minWidth: '70px' }}>
                        <div className="proc-stat-lbl">Power</div>
                        <span
                          className="badge-pill"
                          style={{
                            backgroundColor:
                              app.power_impact === 'High'
                                ? 'var(--rose-50)'
                                : app.power_impact === 'Moderate'
                                ? 'var(--amber-50)'
                                : 'var(--emerald-50)',
                            color:
                              app.power_impact === 'High'
                                ? 'var(--rose-700)'
                                : app.power_impact === 'Moderate'
                                ? 'var(--amber-700)'
                                : 'var(--emerald-700)',
                          }}
                        >
                          {app.power_impact}
                        </span>
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
        /* FLAT PID TABLE VIEW */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 18px' }}>Process / Application</th>
                  <th style={{ padding: '12px 14px' }}>PID</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>CPU %</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>RAM Usage</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Power Impact</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Hog Score</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlat.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No processes match current filters.
                    </td>
                  </tr>
                ) : (
                  filteredFlat.map((proc) => (
                    <tr key={proc.pid}>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {proc.title || proc.name}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                            ({proc.name})
                          </span>
                          {proc.is_hog && (
                            <span className="badge-pill badge-neutral" style={{ fontSize: '10px' }}>
                              Hog
                            </span>
                          )}
                          {proc.is_protected && (
                            <span className="badge-pill" style={{ backgroundColor: '#F1F5F9', color: '#64748B', fontSize: '10px' }}>
                              Protected
                            </span>
                          )}
                        </div>
                        {proc.description && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {proc.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {proc.pid}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {proc.cpu_percent}%
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-main)' }}>
                        {formatMemory(proc.memory_mb)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span
                          className="badge-pill"
                          style={{
                            backgroundColor:
                              proc.power_impact === 'High'
                                ? 'var(--rose-50)'
                                : proc.power_impact === 'Moderate'
                                ? 'var(--amber-50)'
                                : 'var(--emerald-50)',
                            color:
                              proc.power_impact === 'High'
                                ? 'var(--rose-700)'
                                : proc.power_impact === 'Moderate'
                                ? 'var(--amber-700)'
                                : 'var(--emerald-700)',
                          }}
                        >
                          {proc.power_impact}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber-700)' }}>
                        {proc.hog_score}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        {proc.is_protected ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Protected</span>
                        ) : (
                          <button
                            onClick={() => handleEndPidPrompt(proc)}
                            className="btn-end-app"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            End Task
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
    </div>
  );
}
