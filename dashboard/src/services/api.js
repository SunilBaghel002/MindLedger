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
}

export const api = new MindLedgerAPI();
