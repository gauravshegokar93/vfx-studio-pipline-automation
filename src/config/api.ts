/**
 * API Configuration
 * Proxy requests through Next.js rewrite to solve CORS and Cloudflare Tunnel domain issues.
 */
export const API_BASE_URL = typeof window !== 'undefined'
  ? "/api"
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api");

export const ENDPOINTS = {
  AUTH: `${API_BASE_URL}/auth`,
  PROJECTS: `${API_BASE_URL}/projects`,
  SHOTS: `${API_BASE_URL}/shots`,
  TASKS: `${API_BASE_URL}/tasks`,
  USERS: `${API_BASE_URL}/users`,
  IMPORT: `${API_BASE_URL}/import`,
  ANALYTICS: `${API_BASE_URL}/analytics`,
};
