import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AppTrendChart({ trend = [] }) {
  const labels = trend.length > 0 ? trend.map((t) => t.date) : ['Today'];
  const minsData = trend.length > 0 ? trend.map((t) => Math.round((t.total_seconds || 0) / 60)) : [0];

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Screen Time (mins)',
        data: minsData,
        borderColor: '#4A90D9',
        backgroundColor: 'rgba(74, 144, 217, 0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#4A90D9',
        pointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'Inter', sans-serif", size: 11 } },
      },
      y: {
        grid: { color: '#EDF2F7' },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          callback: (value) => `${value}m`,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
      <div className="card-header">
        <h2 className="card-title">
          <span className="card-icon">📈</span> App Screen Time Trend
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Daily total minutes
        </span>
      </div>
      <div style={{ height: '220px', position: 'relative' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
