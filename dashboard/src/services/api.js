/**
 * MindLedger API Service Client for React
 */

class MindLedgerAPI {
    constructor(baseUrl = '/api/v1') {
        this.baseUrl = baseUrl;
    }

    async _request(endpoint, options = {}) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const json = await response.json();
            if (!json.success) {
                throw new Error(json.error || 'API call unsuccessful');
            }

            return json.data;
        } catch (error) {
            console.warn(`MindLedgerAPI [${endpoint}]:`, error.message);
            throw error;
        }
    }

    async getHealth() {
        return this._request('/health');
    }

    async getTodayDashboard() {
        return this._request('/dashboard/today');
    }

    async getLiveStatus(options = {}) {
        return this._request('/dashboard/live', options);
    }

    async getVitals(options = {}) {
        return this._request('/dashboard/vitals', options);
    }

    async getProcesses(filter = 'user', sortBy = 'memory', options = {}) {
        const queryParams = new URLSearchParams({ filter, sort_by: sortBy });
        return this._request(`/processes?${queryParams.toString()}`, options);
    }

    async terminateProcess(pid, processName = '', force = false) {
        return this._request('/processes/terminate', {
            method: 'POST',
            body: JSON.stringify({
                pid,
                process_name: processName || undefined,
                force,
            }),
        });
    }

    async optimizeProcesses(minScore = 15.0) {
        return this._request(`/processes/optimize?min_score=${minScore}`, {
            method: 'POST',
        });
    }

    async getBatteryStatus() {
        return this._request('/battery/status');
    }

    async getBatteryHealth() {
        return this._request('/battery/health');
    }

    async getBatteryDrainers(limit = 10) {
        return this._request(`/battery/drainers?limit=${limit}`);
    }

    async getBatteryHistory(dateStr = '') {
        const queryStr = dateStr ? `?date=${dateStr}` : '';
        return this._request(`/battery/history${queryStr}`);
    }

    async getTodayApps() {
        return this._request('/apps/today');
    }

    async getAppAnalytics(rangePreset = 'today', category = '') {
        const queryParams = new URLSearchParams();
        if (rangePreset) queryParams.append('range_preset', rangePreset);
        if (category && category !== 'all') queryParams.append('category', category);
        const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return this._request(`/apps/analytics${queryStr}`);
    }

    async getTodayBrowser() {
        return this._request('/browser/today');
    }

    async getBrowserAnalytics(rangePreset = 'today', category = '') {
        const queryParams = new URLSearchParams();
        if (rangePreset) queryParams.append('range_preset', rangePreset);
        if (category && category !== 'all') queryParams.append('category', category);
        const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return this._request(`/browser/analytics${queryStr}`);
    }

    async getDomainDetails(domain, rangePreset = 'today') {
        const queryParams = new URLSearchParams({ domain });
        if (rangePreset) queryParams.append('range_preset', rangePreset);
        return this._request(`/browser/domain-details?${queryParams.toString()}`);
    }

    async getTodayYoutube() {
        return this._request('/youtube/today');
    }

    async getYoutubeAnalytics(rangePreset = 'today', category = '', search = '') {
        const queryParams = new URLSearchParams();
        if (rangePreset) queryParams.append('range_preset', rangePreset);
        if (category && category !== 'all') queryParams.append('category', category);
        if (search && search.trim()) queryParams.append('search', search.trim());
        const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return this._request(`/youtube/analytics${queryStr}`);
    }

    async getReportHistory() {
        return this._request('/reports/history');
    }

    async generateReport(reportType = 'daily', dateStr = '', sendEmail = false, recipient = '') {
        return this._request('/reports/generate', {
            method: 'POST',
            body: JSON.stringify({
                report_type: reportType,
                date: dateStr,
                send_email: sendEmail,
                recipient: recipient || undefined,
            }),
        });
    }

    async sendReportEmail(reportType = 'daily', dateStr = '', recipient = '') {
        return this._request('/reports/send-email', {
            method: 'POST',
            body: JSON.stringify({
                report_type: reportType,
                date: dateStr,
                send_email: true,
                recipient: recipient || undefined,
            }),
        });
    }

    getReportDownloadUrl(reportType = 'daily', dateStr = '', format = 'html') {
        const fmt = format === 'pdf' ? 'pdf' : 'html';
        return `${this.baseUrl}/reports/download/${fmt}?report_type=${reportType}&date_str=${dateStr}`;
    }

    async getSettings() {
        return this._request('/settings');
    }

    async updateSettings(settingsObj) {
        return this._request('/settings', {
            method: 'POST',
            body: JSON.stringify(settingsObj),
        });
    }

    async testEmail(recipient = '') {
        return this._request('/settings/test-email', {
            method: 'POST',
            body: JSON.stringify({ recipient_email: recipient || undefined }),
        });
    }

    async getCategoryRules() {
        return this._request('/settings/rules');
    }

    async createCategoryRule(ruleObj) {
        return this._request('/settings/rules', {
            method: 'POST',
            body: JSON.stringify(ruleObj),
        });
    }

    async deleteCategoryRule(ruleId) {
        return this._request(`/settings/rules/${ruleId}`, {
            method: 'DELETE',
        });
    }

    async clearHistory() {
        return this._request('/settings/clear-history', {
            method: 'POST',
        });
    }

    getExportDataUrl(format = 'json') {
        return `${this.baseUrl}/settings/export?format=${format}`;
    }
}

export const api = new MindLedgerAPI();
