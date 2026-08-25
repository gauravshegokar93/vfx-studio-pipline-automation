/**
 * Application Routes Configuration
 * Centralized route definitions for easy navigation flow updates.
 */

export const ROUTES = {
  LOGIN: "/login",
  WORKSPACE: "/workspace",
  DASHBOARD: "/dashboard",
  REVIEW: "/review",
  ANALYTICS: "/analytics",
  PROJECTS: "/projects",
  TASKS: "/tasks",
  USERS: "/users",
  SETTINGS: "/settings",
} as const;

/**
 * Post-login redirect target.
 * Change this to ROUTES.WORKSPACE when the Workspace module is ready.
 */
export const POST_LOGIN_REDIRECT = ROUTES.DASHBOARD;
