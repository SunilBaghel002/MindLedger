import React, { useEffect, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
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

export default function ProcessesPage() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Sample process preview data representing active system & background state
  const mockProcesses = [
    {
      id: 1,
      name: 'Code.exe',
      title: 'MindLedger — Visual Studio Code',
      type: 'user',
      cpu: 1.8,
      memoryMb: 384,
      powerImpact: 'Low',
      isHog: false,
      isProtected: false,
    },
    {
      id: 2,
      name: 'chrome.exe',
      title: 'MindLedger Dashboard — Google Chrome',
      type: 'user',
      cpu: 2.4,
      memoryMb: 612,
      powerImpact: 'Moderate',
      isHog: false,
      isProtected: false,
    },
    {
      id: 3,
      name: 'Discord.exe',
      title: 'Discord (Background Idle)',
      type: 'user',
      cpu: 3.8,
      memoryMb: 420,
      powerImpact: 'High',
      isHog: true,
      isProtected: false,
    },
    {
      id: 4,
      name: 'explorer.exe',
      title: 'Windows Explorer',
      type: 'system',
      cpu: 0.2,
      memoryMb: 110,
      powerImpact: 'Minimal',
      isHog: false,
      isProtected: true,
    },
    {
      id: 5,
      name: 'Spotify.exe',
      title: 'Spotify Free',
      type: 'user',
      cpu: 0.9,
      memoryMb: 245,
      powerImpact: 'Low',
      isHog: false,
      isProtected: false,
    },
  ];

  const filtered = mockProcesses.filter((proc) => {
    if (filter === 'user' && proc.type !== 'user') return false;
    if (filter === 'hogs' && !proc.isHog) return false;
    if (filter === 'system' && proc.type !== 'system') return false;
    if (searchTerm) {
      const matchName = proc.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTitle = proc.title.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchTitle) return false;
    }
    return true;
  });

  const handleEndTask = (proc) => {
    setSelectedProcess(proc);
    setIsConfirmOpen(true);
  };

  return (
    <section className="page-section">
      {/* Top Banner */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-lg)',
          background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
          borderLeft: '4px solid var(--primary-500)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-blue">Phase 8: Background Supervisor</span>
              <span className="badge badge-emerald">Active Scanner</span>
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
              Process & Resource Hog Manager
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Live background process tracking, memory leak detection, and protected process termination.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-600)' }}>
              {mockProcesses.length}
            </span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Monitored Apps</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Tabs & Search */}
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All ({mockProcesses.length})
          </button>
          <button
            className={`btn btn-sm ${filter === 'user' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('user')}
          >
            User Apps (4)
          </button>
          <button
            className={`btn btn-sm ${filter === 'hogs' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('hogs')}
          >
            Resource Hogs (1)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      {/* Process Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Process Name</th>
              <th>Window / App Title</th>
              <th>CPU %</th>
              <th>RAM Usage</th>
              <th>Power Impact</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((proc) => (
              <tr key={proc.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                    <FiLayers style={{ color: 'var(--primary-blue)' }} />
                    {proc.name}
                    {proc.isProtected && (
                      <span className="badge badge-blue" style={{ fontSize: '10px', padding: '2px 6px' }}>
                        <FiShield style={{ marginRight: '2px' }} /> Protected
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{proc.title}</td>
                <td>
                  <span
                    className={`badge ${
                      proc.cpu > 3 ? 'badge-rose' : proc.cpu > 1 ? 'badge-amber' : 'badge-emerald'
                    }`}
                  >
                    {proc.cpu}%
                  </span>
                </td>
                <td style={{ fontWeight: '500' }}>{proc.memoryMb} MB</td>
                <td>
                  <span
                    className={`badge ${
                      proc.powerImpact === 'High'
                        ? 'badge-rose'
                        : proc.powerImpact === 'Moderate'
                        ? 'badge-amber'
                        : 'badge-emerald'
                    }`}
                  >
                    {proc.powerImpact}
                  </span>
                </td>
                <td>
                  {proc.isProtected ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Protected</span>
                  ) : (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleEndTask(proc)}
                    >
                      <FiTrash2 /> End Task
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Process Termination"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                setIsConfirmOpen(false);
              }}
            >
              Terminate Process
            </button>
          </>
        }
      >
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Are you sure you want to terminate <strong>{selectedProcess?.name}</strong>?
          Any unsaved work inside this application will be lost.
        </p>
      </Modal>
    </section>
  );
}
