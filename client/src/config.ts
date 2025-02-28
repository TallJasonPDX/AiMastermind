/**
 * API Base URL Configuration
 * 
 * In development mode (localhost):
 * - Direct connection to FastAPI at localhost:8000
 * 
 * In production mode:
 * - Routes through Express proxy at /api
 * - This ensures both same-origin and proper routing
 * - Works even when FastAPI is running on the same Replit instance
 */
export const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:8000" // ✅ Local dev backend (direct to FastAPI)
    : "/api"; // ✅ Use Express proxy in production (handles routing to FastAPI)
