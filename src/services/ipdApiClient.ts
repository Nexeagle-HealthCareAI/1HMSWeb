import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { API_BASE_URL } from '@/app/api';
import { mockAxiosAdapter } from './mockAdapter';

const API_TIMEOUT = 30000;

// Consolidated: this client targets the single easyHMSAPI host (no separate IPD host).
const ipdAxios: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: false,
});

ipdAxios.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (import.meta.env.DEV) {
            console.log('IPD API Request:', {
                method: config.method?.toUpperCase(),
                url: config.url,
                baseURL: config.baseURL,
            });
        }

        const token = useAuthStore.getState().getToken();
        if (token) {
            const headers = config.headers instanceof AxiosHeaders
                ? config.headers
                : AxiosHeaders.from(config.headers || {});
            headers.set('Authorization', `Bearer ${token}`);
            config.headers = headers;

            // If in mock bypass mode, use mock adapter
            if (token === 'mock-jwt-token-bypass') {
                config.adapter = mockAxiosAdapter as any;
            }
        }

        const csrfToken = localStorage.getItem('csrf-token');
        if (csrfToken && config.headers) {
            (config.headers as any)['X-CSRF-Token'] = csrfToken;
        }

        return config;
    },
    (error: AxiosError) => Promise.reject(error),
);

ipdAxios.interceptors.response.use(
    (response: AxiosResponse) => {
        if (import.meta.env.DEV) {
            console.log('IPD API Response:', {
                status: response.status,
                url: response.config.url,
            });
        }
        return response;
    },
    (error: AxiosError) => {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 401) {
                // DEV-only IPD preview routes render the app shell without a real login, so the shell's
                // background calls (alerts, etc.) return 401 — don't hijack the preview by logging out
                // and redirecting to /login. Real routes still redirect as normal.
                const isDevPreview = import.meta.env.DEV && /(-preview|mobile-review)/.test(window.location.pathname);
                if (!isDevPreview) {
                    useAuthStore.getState().logout();
                    window.location.href = '/login';
                }
            } else {
                console.error(`IPD API HTTP ${status}:`, data);
            }
        } else if (error.request) {
            console.error('IPD API network error:', error.request);
        } else {
            console.error('IPD API error:', error.message);
        }
        return Promise.reject(error);
    },
);

export const ipdApiClient = {
    get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
        ipdAxios.get(url, config).then(r => r.data),
    post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
        ipdAxios.post(url, data, config).then(r => r.data),
    put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
        ipdAxios.put(url, data, config).then(r => r.data),
    patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
        ipdAxios.patch(url, data, config).then(r => r.data),
    delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
        ipdAxios.delete(url, config).then(r => r.data),
};

export { ipdAxios };
