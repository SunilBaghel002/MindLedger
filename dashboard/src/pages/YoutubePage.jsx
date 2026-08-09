import React from 'react';

export default function YoutubePage() {
  return (
    <section className="page-section">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="card-icon">📺</span> YouTube Detailed Analytics
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>
          Educational vs entertainment breakdown, channel watch durations, and video log.
        </p>
      </div>
    </section>
  );
}
