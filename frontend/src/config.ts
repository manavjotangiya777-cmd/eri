export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? `${window.location.origin}/api` : 'http://localhost:5000/api');
export const API_BASE = window.location.origin;
export const FILE_BASE = API_URL.replace(/\/api\/?$/, '');

