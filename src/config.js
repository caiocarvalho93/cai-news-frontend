// API Configuration
const config = {
  development: {
    apiUrl: '', // Uses proxy in development
  },
  production: {
    apiUrl: 'https://cai-intelligence-backend.azurewebsites.net',
  }
};

const environment = import.meta.env.MODE || 'development';
export const API_BASE_URL = config[environment].apiUrl;

// Helper function to build API URLs
export function apiUrl(endpoint) {
  return `${API_BASE_URL}${endpoint}`;
}