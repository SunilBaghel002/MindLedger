import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ActivityTimeline({ timeline }) {
  const hours = timeline?.labels || ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM'];
  const productiveMins = timeline?.productive || [45, 50, 40, 55, 20, 15, 45, 50, 30, 40, 20, 10];
  const neutralMins = timeline?.neutral || [10, 5, 10, 5, 25, 30, 10, 5, 15, 10, 20, 15];
  const unproductiveMins = timeline?.unproductive || [5, 5, 10, 0, 15, 15, 5, 5, 15, 10, 20, 35];
  const isSample = !timeline;

  const data = {
    labels: hours,
    datasets: [
      {
        label: 'Productive',
        data: productiveMins,
        backgroundColor: '#48BB78',
        borderRadius: 4,
      },
      {
        label: 'Neutral',
        data: neutralMins,
        backgroundColor: '#ED8936',
        borderRadius: 4,
      },
      {
        label: 'Unproductive',
        data: unproductiveMins,
        backgroundColor: '#FC8181',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { family: "'Inter', sans-serif", size: 11 } },
      },
      y: {
        stacked: true,
        max: 60,
        grid: { color: '#EDF2F7' },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          callback: (value) => `${value}m`,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { usePointStyle: true, font: { family: "'Inter', sans-serif", size: 12 } },
      },
    },
  };

  return (
    <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
      <div className="card-header">
        <h2 className="card-title">
          <span className="card-icon">📈</span> Today's Activity Timeline
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {isSample ? 'Hourly breakdown (Sample Data)' : 'Hourly breakdown (mins)'}
        </span>
      </div>
      <div style={{ height: '240px', position: 'relative' }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
