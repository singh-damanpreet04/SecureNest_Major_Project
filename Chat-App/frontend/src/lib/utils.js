export function formatMessageTime(date) {
    return new Date(date).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

export function formatMessageDate(timestamp) {
    if (!timestamp) return '';
    
    const today = new Date();
    const messageDate = new Date(timestamp);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return messageDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    }
}

/**
 * Format duration in seconds to MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string (e.g., "02:30")
 */
export function formatDuration(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate a URL for viewing a file
 * @param {string} url - The original file URL
 * @param {string} type - The type of file ('image', 'video', 'pdf')
 * @param {string} fileName - Optional filename for download
 * @returns {string} Formatted URL
 */
export function getCloudinaryUrl(url, type = 'raw', fileName = '') {
    if (!url) return '';
    
    // If it's a local file path (starts with /uploads), return as is
    if (url.startsWith('/uploads/')) {
        return url;
    }
    
    // For Cloudinary URLs
    const baseUrl = url.split('?')[0];
    
    // Add appropriate parameters based on file type
    switch(type) {
        case 'video':
            return `${baseUrl}?resource_type=video`;
        case 'pdf':
            return `${baseUrl}?fl_attachment${fileName ? `=${encodeURIComponent(fileName)}` : ''}`;
        case 'image':
            return `${baseUrl}?f_auto,q_auto`;
        default:
            return `${baseUrl}?fl_attachment${fileName ? `=${encodeURIComponent(fileName)}` : ''}`;
    }
}

/**
 * Generate a Cloudinary download URL
 * @param {string} url - The original Cloudinary URL
 * @param {string} fileName - The desired filename for the download
 * @returns {string} Download URL
 */
export function getCloudinaryDownloadUrl(url, fileName = '') {
    if (!url) return '';
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?fl_attachment${fileName ? `=${encodeURIComponent(fileName)}` : ''}`;
}

export function b64ToUint8Array(b64) {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}