import React from 'react';

export default function SettingsPage() {
  return (
    <section className="page-section">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="card-icon">⚙️</span> MindLedger Configuration
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>
          System tracking thresholds, email preferences, and classification rule management.
        </p>
      </div>
    </section>
  );
}
