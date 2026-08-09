/**
 * MindLedger - Dashboard JavaScript Utilities
 */

/**
 * Format duration in seconds to human readable string (e.g. "4h 20m" or "45m" or "12s")
 * @param {number} totalSeconds 
 * @returns {string}
 */
function secondsToHms(totalSeconds) {
    if (!totalSeconds || totalSeconds <= 0) return '0m';
    
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    if (h > 0) {
        return `${h}h ${m}m`;
    } else if (m > 0) {
        return `${m}m`;
    } else {
        return `${s}s`;
    }
}

/**
 * Format ISO datetime string to localized time (e.g. "02:45 PM")
 * @param {string} isoString 
 * @returns {string}
 */
function formatTime(isoString) {
    if (!isoString) return '--:--';
    try {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) {
            return isoString;
        }
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return isoString;
    }
}

/**
 * Get CSS color token string based on productivity / category
 * @param {string} type 
 * @returns {string}
 */
function getCategoryColor(type) {
    const key = (type || '').toLowerCase();
    switch (key) {
        case 'productive':
        case 'coding':
        case 'work':
            return 'var(--color-productive)';
        case 'learning':
        case 'education':
        case 'study':
            return 'var(--color-learning)';
        case 'neutral':
        case 'communication':
        case 'utility':
            return 'var(--color-neutral)';
        case 'unproductive':
        case 'entertainment':
        case 'social':
            return 'var(--color-unproductive)';
        case 'music':
            return 'var(--color-music)';
        default:
            return 'var(--primary-blue)';
    }
}

/**
 * Render HTML badge string for productivity or category
 * @param {string} type 
 * @param {string} [label] 
 * @returns {string}
 */
function renderBadge(type, label) {
    const text = label || type || 'Uncategorized';
    const key = (type || '').toLowerCase();
    let badgeClass = 'badge-neutral';
    
    if (['productive', 'coding', 'work'].includes(key)) {
        badgeClass = 'badge-productive';
    } else if (['learning', 'education'].includes(key)) {
        badgeClass = 'badge-learning';
    } else if (['unproductive', 'entertainment', 'social'].includes(key)) {
        badgeClass = 'badge-unproductive';
    }
    
    return `<span class="badge ${badgeClass}">${text}</span>`;
}

/**
 * Show a floating toast message
 * @param {string} message 
 * @param {number} [durationMs=3000] 
 */
function showToast(message, durationMs = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, durationMs);
}
