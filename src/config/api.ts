/**
 * API Configuration
 * Change API_BASE_URL to point to your SQL Server / Sequelize backend later.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const ENDPOINTS = {
  AUTH: `${API_BASE_URL}/auth`,
  PROJECTS: `${API_BASE_URL}/projects`,
  SHOTS: `${API_BASE_URL}/shots`,
  TASKS: `${API_BASE_URL}/tasks`,
  USERS: `${API_BASE_URL}/users`,
  IMPORT: `${API_BASE_URL}/import`,
  ANALYTICS: `${API_BASE_URL}/analytics`,
};
