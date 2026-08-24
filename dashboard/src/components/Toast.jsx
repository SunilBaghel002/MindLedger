import React from 'react';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiX,
} from 'react-icons/fi';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  const renderIcon = (type) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="text-emerald" style={{ fontSize: '18px' }} />;
      case 'warning':
        return <FiAlertTriangle className="text-amber" style={{ fontSize: '18px' }} />;
      case 'danger':
      case 'error':
        return <FiAlertCircle className="text-rose" style={{ fontSize: '18px' }} />;
      default:
        return <FiInfo className="text-blue" style={{ fontSize: '18px' }} />;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.type || 'info'}`}>
          {renderIcon(toast.type)}
          <div style={{ flex: 1 }}>
            {toast.title && (
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>
                {toast.title}
              </div>
            )}
            <div style={{ color: 'var(--text-secondary)' }}>{toast.message}</div>
          </div>
          {onDismiss && (
            <button
              onClick={() => onDismiss(toast.id)}
              className="modal-close-btn"
              style={{ fontSize: '16px', padding: '2px' }}
            >
              <FiX />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
