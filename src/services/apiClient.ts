import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import { useLuminaStore } from '@/lib/store';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  let token = null;
  if (typeof window !== 'undefined') {
    const sessionStr = localStorage.getItem('vfx-auth-session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        token = session.token;
      } catch (e) {
        // ignore
      }
    }
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});
