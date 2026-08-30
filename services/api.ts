import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL 

// Create Central Axios Instance
export const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ROLE: 'user_role',
  TENANT_ID: 'tenant_id',
} as const;

// Token Helper Functions
export const saveAuthTokens = async ({
  accessToken,
  refreshToken,
  userRole,
  tenantId,
}: {
  accessToken: string;
  refreshToken?: string;
  userRole?: string;
  tenantId?: string;
}) => {
  if (accessToken) {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  }
  if (refreshToken) {
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
  if (userRole) {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_ROLE, userRole);
  }
  if (tenantId) {
    await SecureStore.setItemAsync(STORAGE_KEYS.TENANT_ID, tenantId);
  }
};

export const clearAuthTokens = async () => {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ROLE);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TENANT_ID);
  } catch (error) {
    console.warn('Error clearing auth tokens:', error);
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  } catch {
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  } catch {
    return null;
  }
};

export const getUserRole = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.USER_ROLE);
  } catch {
    return null;
  }
};

// Queue for holding requests while refreshing token
interface QueueItem {
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. Request Interceptor: Attach Access Token automatically
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Only attach token if not already explicitly provided
    if (!config.headers.Authorization) {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. Response Interceptor: Handle 401 & Auto Refresh Token
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If no response or not 401, reject immediately
    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';
    // Skip token refresh for auth endpoints themselves to avoid infinite loops
    if (
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    // If refresh is already in progress, add request to queue
    if (isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (newToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return api(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const storedRefreshToken = await getRefreshToken();

      if (!storedRefreshToken) {
        console.warn('⚠️ No refresh token available. User session expired.');
        await clearAuthTokens();
        processQueue(new Error('No refresh token available'), null);
        return Promise.reject(error);
      }

      console.log('🔄 Access token expired. Refreshing token silently...');
      // Use standard raw axios to prevent interception recursion
      const refreshResponse = await axios.post(`${BACKEND_URL}/auth/refresh`, {
        refresh_token: storedRefreshToken,
      });

      const { access_token, refresh_token: new_refresh_token, tenant_id } = refreshResponse.data;

      if (!access_token) {
        throw new Error('Refresh response missing access token');
      }

      // Save the rotated tokens
      await saveAuthTokens({
        accessToken: access_token,
        refreshToken: new_refresh_token || storedRefreshToken,
        tenantId: tenant_id,
      });

      console.log('✅ Token refreshed successfully!');

      // Update Authorization header for the original request
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
      }

      // Process any other queued requests with the new token
      processQueue(null, access_token);

      return api(originalRequest);
    } catch (refreshError: any) {
      console.error('❌ Token refresh failed:', refreshError?.response?.data || refreshError.message);
      await clearAuthTokens();
      processQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
