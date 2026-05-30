// 🧠 Centralized API config — re-exports the single source of truth.
// All base-URL resolution lives in ../config/api.js. Do NOT add a second
// resolver here (it caused divergent dead-host fallbacks in the past).
export { default, default as API_BASE, createApiUrl, apiCall } from "../config/api.js";
