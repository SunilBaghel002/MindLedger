import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { secondsToHms } from '../utils/formatters';

export default function URLDetailModal({ domain, rangePreset, onClose }) {
  const [urlDetails, setUrlDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!domain) return;

    setLoading(true);
    setError(null);

    api
      .getDomainDetails(domain, rangePreset)
      .then((data) => {
        if (isMounted) {
          setUrlDetails(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch domain URL details');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [domain, rangePreset]);

  if (!domain) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#fff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <h2 className="card-title">
            <span className="card-icon">🔍</span> {domain} Page Breakdown
          </h2>
          <button
            onClick={onClose}
            aria-label="Close page breakdown modal"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <div className="skeleton-loader" style={{ width: '50%', margin: '0 auto 12px' }}></div>
              <p style={{ color: 'var(--text-muted)' }}>Loading URL details...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-unproductive)' }}>
              {error}
            </div>
          ) : urlDetails.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Page Title & URL</th>
                  <th>Visits</th>
                  <th style={{ textAlign: 'right' }}>Time Spent</th>
                </tr>
              </thead>
              <tbody>
                {urlDetails.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ maxWidth: '380px', wordBreak: 'break-word' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '2px' }}>
                        {item.page_title || 'Untitled Page'}
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '11px', color: 'var(--primary-blue)', textDecoration: 'none' }}
                      >
                        {item.url}
                      </a>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {item.visit_count} visits
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--text-main)' }}>
                      {secondsToHms(item.total_seconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔗</div>
              <div className="empty-title">No detailed page logs found</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
