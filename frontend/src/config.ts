export const API_URL = import.meta.env.VITE_API_URL || 'https://eri.errorinfotech.in:5001/api'; // explicitly default to production endpoint
export const API_BASE = window.location.origin;
export const FILE_BASE = API_URL.replace(/\/api\/?$/, '');

