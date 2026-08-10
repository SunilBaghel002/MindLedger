import React from 'react';
import { FiActivity, FiCalendar } from 'react-icons/fi';
import { formatHeaderDate } from '../utils/formatters';

export default function Header({ title }) {
  return (
    <header className="top-header">
      <h1 className="page-title">{title}</h1>
      <div className="header-controls">
        <div className="live-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-productive)', display: 'inline-block' }}></span>
          <FiActivity style={{ color: 'var(--color-productive)' }} /> Live Sync
        </div>
        <div className="date-pill">
          <FiCalendar style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          {formatHeaderDate()}
        </div>
      </div>
    </header>
  );
}
