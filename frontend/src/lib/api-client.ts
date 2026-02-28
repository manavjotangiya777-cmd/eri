import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost/Manav Admin 1/api';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the JWT token to headers
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token'); // Changed from auth_token to token to match AuthContext
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle errors
apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Handle unauthorized error (e.g., redirect to login)
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
