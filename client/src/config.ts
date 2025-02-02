export const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:8000" // ✅ Local dev backend
    : "https://your-replit-instance.replit.app"; // ✅ Replit-hosted backend
