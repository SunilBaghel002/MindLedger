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
     */
    renderActivityTimeline(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.instances[canvasId]) {
            this.instances[canvasId].destroy();
        }

        // Mock 12-hour hourly timeline buckets for initial foundation rendering
        const hours = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM'];
        const productiveMins = [45, 50, 40, 55, 20, 15, 45, 50, 30, 40, 20, 10];
        const neutralMins = [10, 5, 10, 5, 25, 30, 10, 5, 15, 10, 20, 15];
        const unproductiveMins = [5, 5, 10, 0, 15, 15, 5, 5, 15, 10, 20, 35];

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
