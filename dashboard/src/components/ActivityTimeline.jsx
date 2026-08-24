import React, { useState } from 'react';
import {
  FiActivity,
  FiBarChart2,
  FiClock,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi';
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

export default function ActivityTimeline({ timeline, isLoading = false }) {
  const [chartType, setChartType] = useState('area'); // 'area' or 'bar'
  const [rangeMode, setRangeMode] = useState('active'); // 'active' (8 AM - 8 PM) or 'full' (24h)

  // Default labels and datasets
  const allLabels = timeline?.labels || [
    '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM',
    '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM',
    '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM',
  ];
  const allProductive = timeline?.productive || new Array(24).fill(0);
  const allNeutral = timeline?.neutral || new Array(24).fill(0);
  const allUnproductive = timeline?.unproductive || new Array(24).fill(0);

  // Filter for Active Hours (8 AM - 8 PM: indices 8 through 20)
  let labels = allLabels;
  let productive = allProductive;
  let neutral = allNeutral;
  let unproductive = allUnproductive;

  if (rangeMode === 'active' && allLabels.length === 24) {
    labels = allLabels.slice(6, 22); // 6 AM to 9 PM
    productive = allProductive.slice(6, 22);
    neutral = allNeutral.slice(6, 22);
    unproductive = allUnproductive.slice(6, 22);
  }

  // Calculate Peak Hour and Total Active Time
  let peakIndex = 0;
  let maxMinutes = 0;
  let totalActiveMinutes = 0;

  allProductive.forEach((val, idx) => {
    const totalHour = val + (allNeutral[idx] || 0) + (allUnproductive[idx] || 0);
    totalActiveMinutes += totalHour;
    if (totalHour > maxMinutes) {
      maxMinutes = totalHour;
      peakIndex = idx;
    }
  });

  const peakHourLabel = allLabels[peakIndex] || 'N/A';

  // Area Chart Data
  const areaData = {
    labels,
    datasets: [
      {
        label: 'Productive',
        data: productive,
        borderColor: '#10B981',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 220);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
          return gradient;
        },
        fill: true,
        tension: 0.38,
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
      },
      {
        label: 'Neutral',
        data: neutral,
        borderColor: '#F59E0B',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 220);
          gradient.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
          gradient.addColorStop(1, 'rgba(245, 158, 11, 0.02)');
          return gradient;
        },
        fill: true,
        tension: 0.38,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#F59E0B',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
      },
      {
        label: 'Unproductive',
        data: unproductive,
        borderColor: '#F43F5E',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 220);
          gradient.addColorStop(0, 'rgba(244, 63, 94, 0.35)');
          gradient.addColorStop(1, 'rgba(244, 63, 94, 0.02)');
          return gradient;
        },
        fill: true,
        tension: 0.38,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#F43F5E',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
      },
    ],
  };

  // Stacked Bar Data
  const barData = {
    labels,
    datasets: [
      {
        label: 'Productive',
        data: productive,
        backgroundColor: '#10B981',
        borderRadius: { topLeft: 4, topRight: 4 },
        barPercentage: 0.65,
        categoryPercentage: 0.8,
      },
      {
        label: 'Neutral',
        data: neutral,
        backgroundColor: '#F59E0B',
        borderRadius: { topLeft: 4, topRight: 4 },
        barPercentage: 0.65,
        categoryPercentage: 0.8,
      },
      {
        label: 'Unproductive',
        data: unproductive,
        backgroundColor: '#F43F5E',
        borderRadius: { topLeft: 4, topRight: 4 },
        barPercentage: 0.65,
        categoryPercentage: 0.8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        stacked: chartType === 'bar',
        grid: {
          display: false,
        },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
          color: '#64748B',
          maxRotation: 0,
        },
      },
      y: {
        stacked: chartType === 'bar',
        min: 0,
        max: 60,
        grid: {
          color: '#F1F5F9',
          drawBorder: false,
        },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#94A3B8',
          stepSize: 15,
          callback: (value) => `${value}m`,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          padding: 16,
          font: { family: "'Inter', sans-serif", size: 12, weight: '600' },
          color: '#475569',
        },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { family: "'Inter', sans-serif", size: 12, weight: '700' },
        bodyFont: { family: "'Inter', sans-serif", size: 11 },
        padding: 12,
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          label: (context) => {
            const val = context.raw || 0;
            return `  ${context.dataset.label}: ${val} mins`;
          },
          footer: (tooltipItems) => {
            let sum = 0;
            tooltipItems.forEach((item) => {
              sum += item.raw || 0;
            });
            return `Total Active: ${sum} mins`;
          },
        },
      },
    },
    animation: {
      duration: 750,
      easing: 'easeOutQuart',
    },
  };

  return (
    <div className="card timeline-card" style={{ marginBottom: 'var(--space-xl)' }}>
      {/* Header with Title and Interactive Controls */}
      <div className="card-header timeline-header">
        <div className="timeline-title-group">
          <h2 className="card-title">
            <span className="card-icon text-emerald">
              <FiTrendingUp />
            </span>
            Today's Activity Timeline
          </h2>
          <div className="timeline-vitals-pills">
            {maxMinutes > 0 ? (
              <span className="timeline-pill peak-pill" title="Peak concentration hour today">
                <FiZap /> Peak: {peakHourLabel} ({maxMinutes}m)
              </span>
            ) : null}
            <span className="timeline-pill total-pill">
              <FiClock /> Active: {totalActiveMinutes}m
            </span>
          </div>
        </div>

        {/* View Controls Switcher */}
        <div className="timeline-controls">
          {/* Active vs Full Day Filter */}
          <div className="btn-group-pill">
            <button
              className={`pill-btn ${rangeMode === 'active' ? 'active' : ''}`}
              onClick={() => setRangeMode('active')}
              title="Show 6 AM to 9 PM"
            >
              Focus Hours
            </button>
            <button
              className={`pill-btn ${rangeMode === 'full' ? 'active' : ''}`}
              onClick={() => setRangeMode('full')}
              title="Show 24 Hours"
            >
              24h
            </button>
          </div>

          {/* Chart Type Toggle */}
          <div className="btn-group-pill">
            <button
              className={`pill-btn ${chartType === 'area' ? 'active' : ''}`}
              onClick={() => setChartType('area')}
              title="Smooth Gradient Curve"
            >
              <FiActivity /> Curve
            </button>
            <button
              className={`pill-btn ${chartType === 'bar' ? 'active' : ''}`}
              onClick={() => setChartType('bar')}
              title="Stacked Hourly Bars"
            >
              <FiBarChart2 /> Bars
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas or Loading Shimmer */}
      <div className="timeline-canvas-container" style={{ height: '260px', position: 'relative' }}>
        {isLoading ? (
          <div className="timeline-shimmer-loader">
            <div className="shimmer-wave"></div>
            <span className="shimmer-text">Loading live timeline telemetry...</span>
          </div>
        ) : chartType === 'area' ? (
          <Line data={areaData} options={chartOptions} />
        ) : (
          <Bar data={barData} options={chartOptions} />
        )}
      </div>
    </div>
  );
}
