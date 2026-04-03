import axios from "axios";

// Change this to match the URL where the FastAPI backend is running
const isLocalhost = typeof window !== "undefined" && 
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const API_BASE_URL =
  import.meta.env.VITE_API_URL || (isLocalhost ? "http://localhost:8000/api" : "/_/backend/api");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
