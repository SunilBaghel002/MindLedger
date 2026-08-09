/**
 * Time and text formatters for MindLedger React Dashboard
 */

export function secondsToHms(totalSeconds) {
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

export function formatHeaderDate(dateObj = new Date()) {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return `📅 ${dateObj.toLocaleDateString('en-US', options)}`;
}
