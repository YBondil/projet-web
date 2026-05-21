// frontend/src/api/base.js (nouveau)
export const API_URL = (() => {
  if (typeof window === "undefined") return "http://localhost:3000";
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1"
    ? "http://localhost:3000"
    : `http://${host}:3000`;
})();
