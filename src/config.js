// API Configuration — re-exports the single source of truth (config/api.js).
// Kept for backwards-compatibility with older imports.
import API_BASE, { createApiUrl } from "./config/api.js";

export const API_BASE_URL = API_BASE;
export const apiUrl = createApiUrl;
export default API_BASE;
