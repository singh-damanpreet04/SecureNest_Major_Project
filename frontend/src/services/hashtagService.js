import API_CONFIG from '../config/api.config';
import { axiosInstance as axios } from '../lib/axios';

// Local fallback suggestions (kept as a last resort)
const LOCAL_SUGGESTIONS = {
  // Greetings
  hello: [
    'Hi there! 👋',
    'Hello! How can I help you today?',
    'Hey! What\'s up? 😊',
  ],
  
  // Celebrations
  birthday: [
    'Happy Birthday! 🎉 Wishing you a fantastic day!',
    'Wishing you a year filled with joy and success! 🎂',
    'Happy Birthday! May all your dreams come true! ✨',
  ],
  
  // Appreciation
  thanks: [
    'You\'re welcome! 😊',
    'Anytime! Happy to help! 🙌',
    'No problem at all! 😄',
  ],
  
  // Default fallback
  default: [
    'Great choice!',
    'That\'s interesting!',
    'Thanks for sharing!',
  ],
};

/**
 * Get suggestions from our backend API
 * @param {string} keyword - The hashtag keyword
 * @returns {Promise<Array<string>>} - Array of suggestions
 */
export const getAISuggestions = async (keyword) => {
  try {
    console.log(`Fetching suggestions for hashtag: #${keyword}`);
    const response = await axios.get('/hashtag/suggestions', {
      params: { q: keyword },
      validateStatus: status => status < 500 // Don't throw for 4xx errors
    });
    
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    
    if (response.status === 200 && response.data?.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    
    if (response.status === 401) {
      console.error('Authentication failed. Please check if you are logged in.');
      // Check if token exists in localStorage
      const token = localStorage.getItem('token');
      console.log('Current token in localStorage:', token ? 'Exists' : 'Missing');
    }
    
    throw new Error(`Invalid response: ${response.status} - ${response.statusText}`);
  } catch (error) {
    console.error('Error in getAISuggestions:', {
      message: error.message,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        params: error.config.params,
        headers: error.config.headers ? Object.keys(error.config.headers) : 'No headers'
      } : 'No config',
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : 'No response'
    });
    throw error; // Re-throw to be handled by the fallback mechanism
  }
};

/**
 * Get fallback suggestions from local data
 * @param {string} keyword - The hashtag keyword
 * @returns {Array<string>} - Array of fallback suggestions
 */
export const getFallbackSuggestions = (keyword) => {
  const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
  return LOCAL_SUGGESTIONS[normalizedKeyword] || LOCAL_SUGGESTIONS.default;
};

/**
 * Get cached suggestions if available and not expired
 * @param {string} key - Cache key (usually the keyword)
 * @returns {Array<string>|null} - Cached suggestions or null if not found/expired
 */
export const getCachedSuggestions = (key) => {
  if (!API_CONFIG.CACHE.ENABLED) return null;
  
  try {
    const cacheKey = `${API_CONFIG.CACHE.PREFIX}${key}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const { timestamp, suggestions } = JSON.parse(cached);
    const now = Date.now();
    
    if (now - timestamp > API_CONFIG.CACHE.TTL) {
      // Cache expired
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
};

/**
 * Save suggestions to cache
 * @param {string} key - Cache key (usually the keyword)
 * @param {Array<string>} suggestions - Suggestions to cache
 */
export const cacheSuggestions = (key, suggestions) => {
  if (!API_CONFIG.CACHE.ENABLED || !suggestions?.length) return;
  
  try {
    const cacheKey = `${API_CONFIG.CACHE.PREFIX}${key}`;
    const cacheData = {
      timestamp: Date.now(),
      suggestions,
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
};

/**
 * Get suggestions with fallback mechanism
 * @param {string} keyword - The hashtag keyword
 * @returns {Promise<Array<string>>} - Array of suggestions
 */
export const getSuggestions = async (keyword) => {
  console.log(`[getSuggestions] Getting suggestions for keyword: ${keyword}`);
  
  // Try cache first
  const cached = getCachedSuggestions(keyword);
  if (cached) {
    console.log(`[getSuggestions] Using cached suggestions for: ${keyword}`);
    return cached;
  }
  
  console.log(`[getSuggestions] No cache hit for: ${keyword}, trying AI suggestions`);
  
  try {
    // Try to get AI suggestions from our backend
    console.log(`[getSuggestions] Calling getAISuggestions for: ${keyword}`);
    const suggestions = await getAISuggestions(keyword);
    console.log(`[getSuggestions] Successfully got ${suggestions.length} AI suggestions for: ${keyword}`);
    
    // Cache the successful response
    console.log(`[getSuggestions] Caching suggestions for: ${keyword}`);
    cacheSuggestions(keyword, suggestions);
    
    return suggestions;
  } catch (error) {
    console.warn(`[getSuggestions] Error getting AI suggestions for ${keyword}:`, error.message);
    
    // If backend fails and we have a fallback delay, wait before showing fallback
    if (API_CONFIG.FALLBACK.ENABLED && API_CONFIG.FALLBACK.DELAY_MS > 0) {
      console.log(`[getSuggestions] Waiting ${API_CONFIG.FALLBACK.DELAY_MS}ms before fallback`);
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.FALLBACK.DELAY_MS));
    }
    
    console.log(`[getSuggestions] Falling back to local suggestions for: ${keyword}`);
    const fallbackSuggestions = getFallbackSuggestions(keyword);
    console.log(`[getSuggestions] Found ${fallbackSuggestions.length} fallback suggestions`);
    
    return fallbackSuggestions;
  }
};
