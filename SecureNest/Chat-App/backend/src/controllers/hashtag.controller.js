import axios from 'axios';
import { LOCAL_SUGGESTIONS } from '../config/hashtagSuggestions.js';

// Get Groq API key from environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY;
// Preferred model can be overridden via env; we also keep a fallback list
const GROQ_MODELS = [
  process.env.GROQ_MODEL,
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'mixtral-8x7b-32768'
].filter(Boolean);

// Cache for storing API responses
const suggestionCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get hashtag suggestions from Groq API or fallback to local suggestions
 * @param {string} keyword - The hashtag keyword
 * @returns {Promise<Array<string>>} - Array of suggestions
 */
const getAISuggestions = async (keyword) => {
  console.log('Processing request for keyword:', keyword);
  
  if (!GROQ_API_KEY) {
    console.error('No Groq API key found in environment variables');
    // Instead of returning fallback, throw an error to be handled by the caller
    throw new Error('Groq API key not configured.');
  } else {
    console.log('Groq API key found, attempting to fetch suggestions');
  }

  const cacheKey = `groq_${keyword.toLowerCase()}`;
  const cached = suggestionCache.get(cacheKey);
  
  // Return cached response if available and not expired
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('Returning cached suggestions for:', keyword);
    return cached.suggestions;
  }

  try {
    // Sanitize keyword to avoid sending odd characters that could break prompts
    const safeKeyword = String(keyword || '').trim().slice(0, 64);

    let lastErr = null;
    let content = '';

    for (const model of GROQ_MODELS) {
      try {
        console.log('[Groq] Trying model:', model);
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model,
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that generates friendly and engaging message suggestions based on hashtags. Keep responses short (under 20 words), warm, and include relevant emojis.'
              },
              {
                role: 'user',
                content: `Generate 3 creative and warm message suggestions for the hashtag #${safeKeyword}. Each should be under 20 words. Return each suggestion on a new line, no numbering.`
              }
            ],
            max_tokens: 120,
            temperature: 0.7,
            stream: false
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GROQ_API_KEY}`
            }
          }
        );
        content = response.data?.choices?.[0]?.message?.content || '';
        if (content) break; // success
      } catch (err) {
        lastErr = err;
        const code = err?.response?.data?.error?.code;
        const status = err?.response?.status;
        console.warn('[Groq] Model attempt failed:', { model, status, code, message: err.message });
        // If decommissioned/invalid model, continue to next
        if (code === 'model_decommissioned' || status === 400) continue;
        // Other errors: break and rethrow
        break;
      }
    }
    if (!content && lastErr) throw lastErr;
    
    const genericPhrases = [
      "great choice! what would you like to know more about this topic?",
      "that's an interesting topic! how can i assist you with this?",
      "thanks for sharing! is there anything specific you'd like to discuss about this?",
      "i appreciate your interest in this topic. what would you like to explore?",
      "that's a great topic! how can i help you with this today?"
    ];

    // Try to parse common formats: JSON array, numbered list, plain lines
    let suggestions = [];
    try {
      const maybeJson = content.trim();
      if (maybeJson.startsWith('[')) {
        const arr = JSON.parse(maybeJson);
        if (Array.isArray(arr)) suggestions = arr.map(s => String(s).trim());
      }
    } catch (_) {}

    if (!suggestions.length) {
      suggestions = content
        .split('\n')
        .map(line => line.replace(/^\d+[\.\)]?\s*/, '').trim())
        .filter(Boolean);
    }

    suggestions = suggestions
      .filter(line =>
        line.length > 0 &&
        !line.toLowerCase().includes('hashtag') &&
        !genericPhrases.includes(line.toLowerCase())
      )
      .slice(0, 3);
    
    // Cache the response
    suggestionCache.set(cacheKey, {
      timestamp: Date.now(),
      suggestions: suggestions // Only cache Groq suggestions
    });

    return suggestions;
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error('Error fetching Groq suggestions:', {
      message: error.message,
      status,
      data
    });
    // Propagate the error up to the caller to handle fallback
    throw error;
  }
};

/**
 * Get fallback suggestions from local data
 * @param {string} keyword - The hashtag keyword
 * @returns {Array<string>} - Array of fallback suggestions
 */
const getFallbackSuggestions = (keyword) => {
  console.log(`[getFallbackSuggestions] Received keyword: "${keyword}"`);
  const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
  console.log(`[getFallbackSuggestions] Normalized keyword: "${normalizedKeyword}"`);
  const suggestions = LOCAL_SUGGESTIONS[normalizedKeyword];
  if (suggestions) {
    console.log(`[getFallbackSuggestions] Found specific suggestions for: "${normalizedKeyword}"`);
    return suggestions;
  } else {
    console.log(`[getFallbackSuggestions] No specific suggestions found for "${normalizedKeyword}".`);
    return []; // Return an empty array if no specific suggestions are found
  }
};

// Simple Levenshtein distance for fuzzy matching
const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
};

// Smart fallback that tries fuzzy/substring matches and defaults if empty
const getSmartFallbackSuggestions = (keyword) => {
  const base = getFallbackSuggestions(keyword);
  if (base.length) return base;
  const normalized = String(keyword || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const keys = Object.keys(LOCAL_SUGGESTIONS).filter(k => k !== 'default');

  // Substring/contains match first
  let matches = keys.filter(k => normalized.includes(k) || k.includes(normalized));
  let suggestions = matches.flatMap(k => LOCAL_SUGGESTIONS[k]);

  // Fuzzy match if still empty (distance <= 2 for short keys, <= 3 for longer)
  if (!suggestions.length) {
    const threshold = normalized.length <= 6 ? 2 : 3;
    matches = keys
      .map(k => ({ k, d: levenshtein(normalized, k) }))
      .filter(({ d }) => d <= threshold)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .map(({ k }) => k);
    suggestions = matches.flatMap(k => LOCAL_SUGGESTIONS[k]);
  }

  if (suggestions.length) {
    console.log('[getSmartFallbackSuggestions] Using fuzzy/substring matched suggestions for:', normalized, 'keys:', matches);
    return suggestions.slice(0, 5);
  }
  // Last resort: default block
  console.log('[getSmartFallbackSuggestions] Using default suggestions for:', normalized);
  return LOCAL_SUGGESTIONS.default || [];
};

// Determine best-matching base key, greeting period, and trailing personalization token (fuzzy)
const extractBaseAndTail = (keyword) => {
  const normalized = String(keyword || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const keys = Object.keys(LOCAL_SUGGESTIONS).filter(k => k !== 'default');

  // 1) Exact or prefix match preferred
  let best = '';
  let bestIndex = -1;
  let bestScore = Infinity;

  for (const k of keys) {
    if (normalized.startsWith(k)) {
      if (k.length > best.length) {
        best = k; bestIndex = 0; bestScore = 0;
      }
    }
  }

  // 2) If not found, try substring match
  if (!best) {
    for (const k of keys) {
      const idx = normalized.indexOf(k);
      if (idx !== -1) {
        // prefer longer keys and earlier matches
        if (k.length > best.length || (k.length === best.length && (bestIndex === -1 || idx < bestIndex))) {
          best = k; bestIndex = idx; bestScore = 0;
        }
      }
    }
  }

  // 3) If still not found, fuzzy align base key near the start using Levenshtein window
  if (!best) {
    const maxWindow = Math.min(normalized.length, 16);
    for (const k of keys) {
      const window = normalized.slice(0, maxWindow);
      const d = levenshtein(window, k);
      const threshold = k.length <= 10 ? 2 : 3;
      if (d <= threshold) {
        // choose the lowest distance, break ties by longer k
        if (d < bestScore || (d === bestScore && k.length > (best?.length || 0))) {
          best = k; bestIndex = 0; bestScore = d;
        }
      }
    }
  }

  // Try to detect greeting period even if base not found
  const periods = ['morning', 'afternoon', 'evening', 'night'];
  let detectedPeriod = '';
  if (normalized.startsWith('good')) {
    const rest = normalized.slice(4); // after 'good'
    let bestPeriod = '';
    let bestPD = Infinity;
    for (const p of periods) {
      const d = levenshtein(rest.slice(0, Math.min(rest.length, p.length + 2)), p);
      if (d < bestPD) { bestPD = d; bestPeriod = p; }
    }
    if (bestPD <= 3) detectedPeriod = bestPeriod;
  }

  if (!best && detectedPeriod) {
    // Map to closest existing base for suggestions
    if (detectedPeriod === 'morning') best = 'goodmorning';
    else if (detectedPeriod === 'night') best = 'goodnight';
    else {
      // we don't have afternoon/evening blocks; reuse morning as base and later replace wording
      best = 'goodmorning';
    }
    // Position after 'good' + period
    const prefixLen = ('good' + detectedPeriod).length;
    const tail = normalized.length > prefixLen ? normalized.slice(prefixLen) : '';
    return { baseKey: best, tail, period: detectedPeriod };
  }

  if (!best) return { baseKey: '', tail: '', period: '' };

  // Compute tail by taking the portion after the matched base (or its approximate length)
  let tail = '';
  if (bestIndex === 0 && normalized.length >= best.length) {
    tail = normalized.slice(best.length);
  } else if (bestIndex > 0) {
    tail = normalized.slice(bestIndex + best.length);
  } else {
    // Fallback: slice after best length from start
    tail = normalized.slice(best.length);
  }

  return { baseKey: best, tail, period: detectedPeriod };
};

const titleCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

// Helper to insert name into a line
const insertName = (text, name) => {
  const patterns = [
    /^good\s*morning/i,
    /^good\s*night/i,
    /^good\s*evening/i,
    /^good\s*afternoon/i,
    /^rise\s*and\s*shine/i,
    /^wishing\s+you/i,
    /^have\s+a\s+great/i,
    /^sending\s+/i
  ];
  const matched = patterns.find(p => p.test(text));
  if (matched) {
    const m = text.match(matched);
    if (m && m[0]) return text.replace(m[0], `${m[0]}, ${name}`);
  }
  if (/\byou\b/i.test(text)) return `${name}, ${text}`;
  if (/[.!?]$/.test(text)) return text.replace(/[.!?]$/, `, ${name}$&`);
  return `${text}, ${name}`;
};

// Insert name/title and adjust greeting period in suggestion
const personalizeSuggestions = (suggestions, baseKey, tail, period) => {
  if (!tail) return suggestions;
  const name = titleCase(tail);
  return suggestions.map(line => {
    const l = line.trim();
      if (period) {
      // Replace any greeting period (morning/afternoon/evening/night) with detected period
      const anyPeriod = /^(good)(\s*)(morning|afternoon|evening|night)/i;
      if (anyPeriod.test(l)) {
        const updated = l.replace(anyPeriod, (match, gGood, gSpace) => `${gGood}${gSpace}${period}`);
        return insertName(updated, name);
      }
    }
    return insertName(l, name);
  });
};

/**
 * Controller for getting hashtag suggestions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getHashtagSuggestions = async (req, res) => {
  console.log('Received request for hashtag suggestions:', req.query);
  
  try {
    const { q: keyword } = req.query;
    
    if (!keyword) {
      console.error('Missing required parameter: q');
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: q'
      });
    }

    console.log(`Fetching suggestions for hashtag: #${keyword}`);
    let allSuggestions = [];

    try {
      const aiSuggestions = await getAISuggestions(keyword);
      allSuggestions = [...aiSuggestions];
    } catch (aiError) {
      console.warn(`[getHashtagSuggestions] AI suggestions failed for ${keyword}:`, aiError.message);
    }

    const fallbackSuggestions = getSmartFallbackSuggestions(keyword);
    allSuggestions = [...new Set([...allSuggestions, ...fallbackSuggestions])];

    // Personalize using trailing token (e.g., goodmorning + sir/name)
    const { baseKey, tail, period } = extractBaseAndTail(keyword);
    if (tail) {
      allSuggestions = personalizeSuggestions(allSuggestions, baseKey, tail, period);
    }

    // Never return an empty array; default to generic suggestions
    if (!allSuggestions.length) {
      console.log('[getHashtagSuggestions] No AI or fallback suggestions; returning default block');
      allSuggestions = LOCAL_SUGGESTIONS.default || [];
    }

    res.status(200).json({
      success: true,
      data: allSuggestions,
    });
  } catch (error) {
    console.error('Error in getHashtagSuggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hashtag suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
