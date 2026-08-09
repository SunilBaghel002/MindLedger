import React from 'react';

export default function ReportsPage() {
  return (
    <section className="page-section">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="card-icon">📊</span> Reports & Summaries
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>
          Daily, weekly, and monthly activity summaries and exported email archives.
        </p>
      </div>
    </section>
  );
}
