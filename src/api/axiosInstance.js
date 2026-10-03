/**
 * Axios instance — the single HTTP client for all API calls in HireTrack.
 *
 * Base URL is read from VITE_API_BASE_URL (set in .env, defaulting to
 * http://localhost:8080 per docs/ARCHITECTURE.md "Local Development Configuration").
 *
 * The JWT Authorization interceptor is added in TASK-010 (AuthContext).
 * Do NOT add auth logic here directly — keep this file concerned only with
 * base configuration and leave interceptor wiring to the auth module.
 *
 * Usage:
 *   import axiosInstance from '../api/axiosInstance';
 *   const response = await axiosInstance.get('/api/applications');
 */

import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const axiosInstance = axios.create({
  baseURL: rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : '',
  headers: {
    'Content-Type': 'application/json',
  },
});

export function pingBackendHealth() {
  return axiosInstance.get('/api/health').catch(() => {});
}

export default axiosInstance;
