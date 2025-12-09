// API Configuration
const API_CONFIG = {
  // Base URL for API requests - defaults to current origin in production
  BASE_URL: import.meta.env.VITE_API_BASE_URL || window.location.origin,
  
  // Local fallback configuration
  FALLBACK: {
    ENABLED: true, // Enable/disable local fallback
    DELAY_MS: 1000, // Delay before showing fallback suggestions (ms)
  },
  
  // Caching configuration
  CACHE: {
    ENABLED: true, // Cache is now enabled
    TTL: 5 * 60 * 1000, // 5 minutes in milliseconds (shorter TTL for fresh suggestions)
    PREFIX: 'ht_sugg_', // Prefix for cache keys
  },
};

// Development defaults - only used in development
if (import.meta.env.DEV) {
  // Default to local development server if no base URL is provided
  if (!import.meta.env.VITE_API_BASE_URL) {
    API_CONFIG.BASE_URL = 'http://localhost:5003';
    console.warn('No VITE_API_BASE_URL set in .env, defaulting to', API_CONFIG.BASE_URL);
  }
}

console.log('API Configuration:', API_CONFIG);

export default API_CONFIG;
