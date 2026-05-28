// 🧠 GROK BRAIN - Centralized API Configuration
// This ensures ALL components use the correct API base URL

const API_BASE = (() => {
  // Check for explicit environment variable (set during build)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }

  // Production environment (Azure backend)
  if (import.meta.env.PROD || window.location.hostname.includes("azurestaticapps.net")) {
    return "https://cai-intelligence-backend.azurewebsites.net";
  }
  
  // Development environment - pointing to Azure backend
  return "https://cai-intelligence-backend.azurewebsites.net";
})();

console.log("🧠 GROK API Base:", API_BASE);

/**
 * Universal API fetch function
 * @param {string} endpoint - API endpoint (e.g., '/api/global-news')
 * @param {object} options - Fetch options
 * @returns {Promise} Response data
 */
export async function apiCall(endpoint, options = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    console.log(`🧠 GROK API Call: ${url}`);

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ GROK API Success: ${endpoint}`);
    return data;
  } catch (error) {
    console.error(`❌ GROK API Error: ${endpoint}`, error);
    throw error;
  }
}

/**
 * Create full API URL
 * @param {string} endpoint - API endpoint
 * @returns {string} Full API URL
 */
export function createApiUrl(endpoint) {
  return `${API_BASE}${endpoint}`;
}

export default API_BASE;