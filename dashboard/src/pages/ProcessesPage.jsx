import React, { useEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiCpu,
  FiFilter,
  FiLayers,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiZap,
} from 'react-icons/fi';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { api } from '../services/api';

export default function ProcessesPage() {
  const [filter, setFilter] = useState('user');
  const [sortBy, setSortBy] = useState('memory');
  const [searchTerm, setSearchTerm] = useState('');
  const [processData, setProcessData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedProcess, setSelectedProcess] = useState(null);
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
    }, 4000);

    const handleVisibility = () => {
      if (!document.hidden) fetchProcesses(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [filter, sortBy]);

  const handleEndTaskPrompt = (proc) => {
    setSelectedProcess(proc);
    setIsConfirmOpen(true);
  };

  const handleConfirmTerminate = async () => {
    if (!selectedProcess) return;
    setIsTerminating(true);

    try {
      const res = await api.terminateProcess(
        selectedProcess.pid,
        selectedProcess.name,
        false
      );
      addToast(
        'success',
        `Terminated ${res.process_name} (PID: ${res.pid}) and freed ~${res.memory_freed_mb} MB RAM.`,
        'Process Terminated'
      );
      setIsConfirmOpen(false);
      setSelectedProcess(null);
      fetchProcesses(false);
    } catch (err) {
      addToast('danger', err.message || 'Failed to terminate process', 'Action Denied');
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
          `Cleaned up ${res.optimized_count} background hog(s), freeing ~${res.total_memory_freed_mb} MB RAM.`,
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

  const processes = processData?.processes || [];
  const filtered = processes.filter((proc) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = proc.name.toLowerCase().includes(q);
      const matchTitle = (proc.title || '').toLowerCase().includes(q);
      if (!matchName && !matchTitle) return false;
    }
    return true;
  });

  return (
    <section className="page-section">
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Top Banner */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-lg)',
          background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
          borderLeft: '4px solid var(--primary-500)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-blue">Process Supervisor</span>
              <span className="badge badge-emerald">Active Real-Time Scanner</span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
              Background Process Manager & Resource Optimizer
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Monitor background RAM & CPU consumers, detect resource hogs, and safely terminate inactive memory drains.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary-600)' }}>
                {processData?.hog_count ?? 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Resource Hogs</div>
            </div>
            {processData?.hog_count > 0 && (
              <button className="btn btn-sm btn-danger" onClick={handleOptimizeHogs}>
                <FiZap /> Clean Up Hogs
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Tabs, Sort, and Search */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          marginBottom: 'var(--space-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${filter === 'user' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('user')}
          >
            User Apps ({processData?.user_processes_count ?? 0})
          </button>
          <button
            className={`btn btn-sm ${filter === 'hogs' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('hogs')}
          >
            Resource Hogs ({processData?.hog_count ?? 0})
          </button>
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All Processes ({processData?.total_processes ?? 0})
          </button>
          <button
            className={`btn btn-sm ${filter === 'system' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('system')}
          >
            System Protected
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <FiFilter /> Sort:
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xs)',
                padding: '4px 8px',
                fontSize: '12px',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                outline: 'none',
              }}
            >
              <option value="memory">RAM Memory (MB)</option>
              <option value="cpu">CPU % Usage</option>
              <option value="hog_score">Hog Impact Score</option>
              <option value="name">Process Name</option>
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              gap: '6px',
            }}
          >
            <FiSearch style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search process..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                fontFamily: 'inherit',
                color: 'var(--text-main)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="card" style={{ textAlign: 'center', padding: '30px', marginBottom: 'var(--space-lg)' }}>
          <FiAlertTriangle className="text-rose" style={{ fontSize: '28px', marginBottom: '8px' }} />
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>{error}</div>
          <button className="btn btn-sm btn-primary" onClick={() => fetchProcesses(true)}>
            <FiRefreshCw /> Retry Scan
          </button>
        </div>
      )}

      {/* Process Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Process Name</th>
              <th>PID</th>
              <th>State</th>
              <th>CPU %</th>
              <th>RAM Usage</th>
              <th>Power Impact</th>
              <th>Hog Score</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((proc) => (
                <tr key={`${proc.pid}-${proc.name}`}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                      <FiLayers style={{ color: 'var(--primary-blue)' }} />
                      <span title={proc.title || proc.name}>{proc.name}</span>
                      {proc.is_protected && (
                        <span className="badge badge-blue" style={{ fontSize: '10px', padding: '1px 6px' }}>
                          <FiShield style={{ marginRight: '2px' }} /> Protected
                        </span>
                      )}
                      {proc.is_hog && (
                        <span className="badge badge-rose" style={{ fontSize: '10px', padding: '1px 6px' }}>
                          ⚠️ Resource Hog
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{proc.pid}</td>
                  <td>
                    <span className={`badge ${proc.is_background ? 'badge-neutral' : 'badge-emerald'}`}>
                      {proc.is_background ? 'Background' : 'Foreground'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        proc.cpu_percent > 5
                          ? 'badge-rose'
                          : proc.cpu_percent > 1.5
                          ? 'badge-amber'
                          : 'badge-emerald'
                      }`}
                    >
                      {proc.cpu_percent}%
                    </span>
                  </td>
                  <td style={{ fontWeight: '600' }}>{proc.memory_mb} MB</td>
                  <td>
                    <span
                      className={`badge ${
                        proc.power_impact === 'High'
                          ? 'badge-rose'
                          : proc.power_impact === 'Moderate'
                          ? 'badge-amber'
                          : 'badge-emerald'
                      }`}
                    >
                      {proc.power_impact}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: '600', color: proc.hog_score >= 15 ? 'var(--rose-500)' : 'var(--text-main)' }}>
                      {proc.hog_score}
                    </span>
                  </td>
                  <td>
                    {proc.is_protected ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Protected</span>
                    ) : (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleEndTaskPrompt(proc)}
                      >
                        <FiTrash2 /> End Task
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {isLoading ? 'Scanning processes...' : 'No matching processes found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Safe Process Termination Confirmation Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => !isTerminating && setIsConfirmOpen(false)}
        title="Confirm Process Termination"
        footer={
          <>
            <button
              className="btn btn-secondary"
              disabled={isTerminating}
              onClick={() => setIsConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              disabled={isTerminating}
              onClick={handleConfirmTerminate}
            >
              {isTerminating ? 'Terminating...' : 'Terminate Task'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-main)' }}>
            Are you sure you want to end process <strong>{selectedProcess?.name}</strong> (PID:{' '}
            {selectedProcess?.pid})?
          </p>
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--amber-50)',
              border: '1px solid var(--amber-100)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              color: 'var(--amber-600)',
            }}
          >
            ⚠️ Any unsaved application state or documents in this process will be lost immediately.
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Memory to release: <strong>~{selectedProcess?.memory_mb} MB</strong>
          </div>
        </div>
      </Modal>
    </section>
  );
}
