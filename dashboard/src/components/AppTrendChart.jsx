import React, { useState } from 'react';
import { FiActivity, FiBarChart2, FiTrendingUp } from 'react-icons/fi';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AppTrendChart({ trend = [], topApps = [] }) {
  const isMultiDay = trend.length > 1;
  const [viewMode, setViewMode] = useState(isMultiDay ? 'trend' : 'apps');

  // Trend line data (multi-day)
  const trendLabels = trend.length > 0 ? trend.map((t) => t.date) : ['Today'];
  const trendMins = trend.length > 0 ? trend.map((t) => Math.round((t.total_seconds || 0) / 60)) : [0];

  const lineData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Screen Time (mins)',
        data: trendMins,
        borderColor: '#6366F1',
        backgroundColor: (context) => {
          const ctx = context.chart?.ctx;
          if (!ctx) return 'rgba(99, 102, 241, 0.15)';
          const gradient = ctx.createLinearGradient(0, 0, 0, 240);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');
          return gradient;
        },
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointBackgroundColor: '#6366F1',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
          color: '#64748B',
        },
      },
      y: {
        grid: { color: '#F1F5F9', drawBorder: false },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#94A3B8',
          callback: (value) => `${value}m`,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { family: "'Inter', sans-serif", size: 12, weight: '700' },
        bodyFont: { family: "'Inter', sans-serif", size: 11 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => ` Screen Time: ${context.raw || 0} mins`,
        },
      },
    },
    animation: {
      duration: 650,
      easing: 'easeOutQuart',
    },
  };

  // Top Apps Comparison Bar Data
  const topAppLabels = topApps.slice(0, 7).map((a) => a.app_name);
  const topAppMins = topApps.slice(0, 7).map((a) => Math.round((a.total_seconds || 0) / 60));
  const topAppColors = topApps.slice(0, 7).map((a) => {
    if (a.productivity === 'productive') return '#10B981';
    if (a.productivity === 'unproductive') return '#F43F5E';
    return '#F59E0B';
  });

  const barData = {
    labels: topAppLabels.length > 0 ? topAppLabels : ['No Applications'],
    datasets: [
      {
        label: 'Active Minutes',
        data: topAppMins.length > 0 ? topAppMins : [0],
        backgroundColor: topAppColors.length > 0 ? topAppColors : ['#6366F1'],
        borderRadius: 6,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    ],
  };

  const barOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { color: '#F1F5F9', drawBorder: false },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#94A3B8',
          callback: (value) => `${value}m`,
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 12, weight: '600' },
          color: '#334155',
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { family: "'Inter', sans-serif", size: 12, weight: '700' },
        bodyFont: { family: "'Inter', sans-serif", size: 11 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => ` Time Spent: ${context.raw || 0} mins`,
        },
      },
    },
    animation: {
      duration: 650,
      easing: 'easeOutQuart',
    },
  };

  return (
    <div className="card timeline-card" style={{ marginBottom: 'var(--space-xl)' }}>
      <div className="card-header timeline-header">
        <div className="timeline-title-group">
          <h2 className="card-title">
            <span className="card-icon text-indigo">
              <FiTrendingUp />
            </span>
            {viewMode === 'apps' ? 'Top Application Usage Comparison' : 'Daily Screen Time Trend'}
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {viewMode === 'apps' ? 'Ranked by active duration' : 'Multi-day total screen time'}
          </span>
        </div>

        {/* View Switcher Controls */}
        <div className="btn-group-pill">
          <button
            className={`pill-btn ${viewMode === 'apps' ? 'active' : ''}`}
            onClick={() => setViewMode('apps')}
            title="Show top applications comparison"
          >
            <FiBarChart2 /> Top Apps
          </button>
          <button
            className={`pill-btn ${viewMode === 'trend' ? 'active' : ''}`}
            onClick={() => setViewMode('trend')}
            title="Show daily screen time trend"
          >
            <FiActivity /> Trend Line
          </button>
        </div>
      </div>

      <div style={{ height: '240px', position: 'relative' }}>
        {viewMode === 'apps' ? (
          <Bar data={barData} options={barOptions} />
        ) : (
          <Line data={lineData} options={lineOptions} />
        )}
      </div>
    </div>
  );
}

