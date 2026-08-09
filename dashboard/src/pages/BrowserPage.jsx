import React from 'react';

export default function BrowserPage() {
  return (
    <section className="page-section">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="card-icon">🌐</span> Browser & Website Analytics
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>
          Domain breakdown, top visited sites, and web activity tracking.
        </p>
      </div>
    </section>
  );
}
