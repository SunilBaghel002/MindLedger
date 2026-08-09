import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryDonut({ breakdown }) {
  const productiveMins = Math.round((breakdown?.productive_time_seconds || 0) / 60);
  const neutralMins = Math.round((breakdown?.neutral_time_seconds || 0) / 60);
  const unproductiveMins = Math.round((breakdown?.unproductive_time_seconds || 0) / 60);

  const data = {
    labels: ['Productive', 'Neutral', 'Unproductive'],
    datasets: [
      {
        data: [productiveMins, neutralMins, unproductiveMins],
        backgroundColor: ['#48BB78', '#ED8936', '#FC8181'],
        borderWidth: 2,
        borderColor: '#FFFFFF',
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          font: { family: "'Inter', sans-serif", size: 12 },
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw || 0} mins`,
        },
      },
    },
    cutout: '70%',
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <span className="card-icon">📊</span> Category Breakdown
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Distribution
        </span>
      </div>
      <div style={{ height: '260px', position: 'relative' }}>
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}
