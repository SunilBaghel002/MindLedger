/**
 * MindLedger - Frontend API Client
 * Interacts with FastAPI local server endpoints (http://localhost:8787/api/v1/...)
 */

class MindLedgerAPI {
    constructor(baseUrl = '/api/v1') {
        this.baseUrl = baseUrl;
    }

    /**
     * Internal wrapper for fetch requests
     * @private
     */
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
            console.error(`MindLedgerAPI Error [${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * Get health status of backend service
     */
    async getHealth() {
        return this._request('/health');
    }

    /**
     * Get today's dashboard summary overview
     */
    async getTodayDashboard() {
        return this._request('/dashboard/today');
    }

    /**
     * Get live active window tracking status
     */
    async getLiveStatus() {
        return this._request('/dashboard/live');
    }

    /**
     * Get today's app usage details & top applications
     */
    async getTodayApps() {
        return this._request('/apps/today');
    }

    /**
     * Get today's browser usage details
     */
    async getTodayBrowser() {
        return this._request('/browser/today');
    }

    /**
     * Get today's YouTube analytics
     */
    async getTodayYoutube() {
        return this._request('/youtube/today');
    }
}

// Global API singleton instance
window.mindLedgerAPI = new MindLedgerAPI();
