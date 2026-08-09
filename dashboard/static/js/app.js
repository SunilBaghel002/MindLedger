/**
 * MindLedger - Main Dashboard Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    MindLedgerApp.init();
});

const MindLedgerApp = {
    pollInterval: null,

    init() {
        this.setupNavigation();
        this.updateHeaderDate();
        this.loadDashboardData();
        this.startLiveTrackingPoll();
    },

    /**
     * Setup sidebar SPA navigation handlers
     */
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.page-section');
        const pageTitle = document.getElementById('current-page-title');

        navItems.forEach(item => {
            const link = item.querySelector('a');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSectionId = link.getAttribute('data-section');

                // Update active state in menu
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Show target page section
                sections.forEach(sec => sec.classList.remove('active'));
                const targetSec = document.getElementById(targetSectionId);
                if (targetSec) {
                    targetSec.classList.add('active');
                }

                // Update header title
                const titleText = link.textContent.trim();
                if (pageTitle) {
                    pageTitle.textContent = titleText;
                }
            });
        });
    },

    /**
     * Set header date pill text
     */
    updateHeaderDate() {
        const datePill = document.getElementById('header-date-pill');
        if (datePill) {
            const today = new Date();
            const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
            datePill.textContent = `📅 ${today.toLocaleDateString('en-US', options)}`;
        }
    },

    /**
     * Fetch today's summary metrics and render to dashboard cards and charts
     */
    async loadDashboardData() {
        try {
            const data = await window.mindLedgerAPI.getTodayDashboard();
            this.renderOverviewData(data);
        } catch (error) {
            console.warn('Failed to load dashboard overview, using default state:', error);
        }
    },

    /**
     * Update Dashboard Overview widgets
     */
    renderOverviewData(data) {
        if (!data) return;

        // 1. Total Screen Time
        const screenTimeEl = document.getElementById('val-screen-time');
        if (screenTimeEl) {
            screenTimeEl.textContent = secondsToHms(data.total_screen_time_seconds || 0);
        }

        // 2. Productive Time & Percentage
        const productiveTimeEl = document.getElementById('val-productive-time');
        const productiveSubEl = document.getElementById('val-productive-percent');
        if (productiveTimeEl) {
            productiveTimeEl.textContent = secondsToHms(data.productive_time_seconds || 0);
        }
        if (productiveSubEl && data.total_screen_time_seconds > 0) {
            const pct = Math.round((data.productive_time_seconds / data.total_screen_time_seconds) * 100);
            productiveSubEl.textContent = `${pct}% of total screen time`;
        }

        // 3. Productivity Score SVG Circle
        const scoreValEl = document.getElementById('val-score');
        const scoreCircleBar = document.getElementById('score-circle-bar');
        const score = Math.round(data.productivity_score || 0);

        if (scoreValEl) {
            scoreValEl.textContent = score;
        }

        if (scoreCircleBar) {
            const radius = 36;
            const circumference = 2 * Math.PI * radius; // ~226.19
            const offset = circumference - (score / 100) * circumference;
            scoreCircleBar.style.strokeDasharray = `${circumference} ${circumference}`;
            scoreCircleBar.style.strokeDashoffset = offset;
            
            // Adjust score stroke color based on threshold
            if (score >= 70) {
                scoreCircleBar.style.stroke = 'var(--color-productive)';
            } else if (score >= 40) {
                scoreCircleBar.style.stroke = 'var(--color-neutral)';
            } else {
                scoreCircleBar.style.stroke = 'var(--color-unproductive)';
            }
        }

        // 4. Render Top Applications Progress Bars
        const topAppsContainer = document.getElementById('top-apps-list');
        if (topAppsContainer && data.top_apps && data.top_apps.length > 0) {
            const maxSecs = Math.max(...data.top_apps.map(a => a.total_seconds || 1));
            topAppsContainer.innerHTML = data.top_apps.map(app => {
                const pct = Math.round((app.total_seconds / maxSecs) * 100);
                const colorClass = app.productivity || 'neutral';
                return `
                    <div class="usage-item">
                        <div class="usage-meta">
                            <span class="usage-name">💻 ${app.app_name}</span>
                            <span class="usage-duration">${secondsToHms(app.total_seconds)}</span>
                        </div>
                        <div class="progress-track">
                            <div class="progress-fill ${colorClass}" style="width: ${pct}%;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 5. Render Charts
        if (window.MindLedgerCharts) {
            window.MindLedgerCharts.renderCategoryDonut('categoryDonutChart', data);
            window.MindLedgerCharts.renderActivityTimeline('activityTimelineChart');
        }
    },

    /**
     * Poll live tracking endpoint every 3s to update sidebar status widget
     */
    startLiveTrackingPoll() {
        const fetchLive = async () => {
            try {
                const liveData = await window.mindLedgerAPI.getLiveStatus();
                this.updateLiveWidget(liveData);
            } catch (err) {
                // Silently fallback if endpoint returns 404 or backend unavailable
                this.updateLiveWidget(null);
            }
        };

        fetchLive();
        this.pollInterval = setInterval(fetchLive, 3000);
    },

    /**
     * Update sidebar Live Tracking status card
     */
    updateLiveWidget(liveData) {
        const dot = document.getElementById('status-dot');
        const textLabel = document.getElementById('status-text');
        const appTitle = document.getElementById('live-app-title');
        const duration = document.getElementById('live-session-duration');

        if (!dot || !textLabel || !appTitle || !duration) return;

        if (liveData && liveData.is_tracking) {
            dot.className = 'status-dot';
            textLabel.textContent = 'Active';
            appTitle.textContent = liveData.current_app || 'Tracking...';
            duration.textContent = `${secondsToHms(liveData.duration_seconds || 0)} this session`;
        } else {
            dot.className = 'status-dot idle';
            textLabel.textContent = 'Standby';
            appTitle.textContent = 'MindLedger Active';
            duration.textContent = 'Monitoring window changes';
        }
    }
};
