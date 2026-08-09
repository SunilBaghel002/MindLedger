/**
 * MindLedger - Chart.js Configurations & Rendering Helpers
 */

const MindLedgerCharts = {
    instances: {},

    /**
     * Render or update Category Breakdown Donut Chart
     * @param {string} canvasId 
     * @param {Object} breakdownData { productive: seconds, learning: seconds, neutral: seconds, unproductive: seconds }
     */
    renderCategoryDonut(canvasId, breakdownData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.instances[canvasId]) {
            this.instances[canvasId].destroy();
        }

        const labels = ['Productive', 'Neutral', 'Unproductive'];
        const dataValues = [
            Math.round((breakdownData.productive_time_seconds || 0) / 60),
            Math.round((breakdownData.neutral_time_seconds || 0) / 60),
            Math.round((breakdownData.unproductive_time_seconds || 0) / 60),
        ];

        const backgroundColors = [
            '#48BB78', // Productive (Green)
            '#ED8936', // Neutral (Orange)
            '#FC8181', // Unproductive (Red)
        ];

        if (typeof Chart !== 'undefined') {
            this.instances[canvasId] = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataValues,
                        backgroundColor: backgroundColors,
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                font: { family: "'Inter', sans-serif", size: 12 },
                                padding: 16
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const val = context.raw || 0;
                                    return ` ${context.label}: ${val} mins`;
                                }
                            }
                        }
                    },
                    cutout: '70%'
                }
            });
        }
    },

    /**
     * Render or update Today's Hourly Activity Timeline Chart (Stacked Bar Chart)
     * @param {string} canvasId 
     * @param {Object} [timelineData] { labels, productive, neutral, unproductive }
     */
    renderActivityTimeline(canvasId, timelineData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.instances[canvasId]) {
            this.instances[canvasId].destroy();
        }

        if (!timelineData || !timelineData.labels || timelineData.labels.length === 0) {
            // Render explicit empty state when no timeline activity is supplied
            const container = ctx.parentElement;
            if (container) {
                container.innerHTML = `
                    <div class="empty-state" style="padding: 40px;">
                        <div class="empty-icon">📈</div>
                        <div class="empty-title">No hourly activity recorded yet today</div>
                    </div>
                `;
            }
            return;
        }

        const hours = timelineData.labels;
        const productiveMins = timelineData.productive || [];
        const neutralMins = timelineData.neutral || [];
        const unproductiveMins = timelineData.unproductive || [];

        if (typeof Chart !== 'undefined') {
            this.instances[canvasId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: hours,
                    datasets: [
                        {
                            label: 'Productive',
                            data: productiveMins,
                            backgroundColor: '#48BB78',
                            borderRadius: 4
                        },
                        {
                            label: 'Neutral',
                            data: neutralMins,
                            backgroundColor: '#ED8936',
                            borderRadius: 4
                        },
                        {
                            label: 'Unproductive',
                            data: unproductiveMins,
                            backgroundColor: '#FC8181',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true,
                            grid: { display: false },
                            ticks: { font: { family: "'Inter', sans-serif", size: 11 } }
                        },
                        y: {
                            stacked: true,
                            max: 60,
                            grid: { color: '#EDF2F7' },
                            ticks: {
                                font: { family: "'Inter', sans-serif", size: 11 },
                                callback: function(value) { return value + 'm'; }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            align: 'end',
                            labels: { usePointStyle: true, font: { family: "'Inter', sans-serif", size: 12 } }
                        }
                    }
                }
            });
        }
    }
};

window.MindLedgerCharts = MindLedgerCharts;
