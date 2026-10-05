/**
 * Axios instance — the single HTTP client for all API calls in HireTrack.
 *
 * Base URL is read from VITE_API_BASE_URL (set in .env, defaulting to
 * http://localhost:8080 per docs/ARCHITECTURE.md).
 */

import axios from 'axios';
import { clearAllQueryCache } from './queries';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const axiosInstance = axios.create({
  baseURL: rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : '',
  headers: {
    'Content-Type': 'application/json',
  },
});

let unauthenticatedCallback = null;

export function setUnauthenticatedCallback(cb) {
  unauthenticatedCallback = cb;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Clear auth ONLY on a true 401 HTTP response from the API server.
    // Never clear token on network errors, CORS failures, 500 errors, or cold-start timeouts.
    if (error.response && error.response.status === 401) {
      clearAllQueryCache();
      localStorage.removeItem('ht_token');
      localStorage.removeItem('token');
      localStorage.removeItem('ht_user');
      if (unauthenticatedCallback) {
        unauthenticatedCallback();
      }
    }
    return Promise.reject(error);
  }
);

export function pingBackendHealth() {
  return axiosInstance.get('/api/health').catch(() => {});
}

export default axiosInstance;
