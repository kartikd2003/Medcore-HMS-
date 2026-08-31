import { apiRequest, clearTokens, getRefreshToken } from './api';
import type { LoginResponse } from './types';

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: { email, password }, public: true }),

  register: (input: { email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
    apiRequest<{ id: string; email: string; message: string }>('/auth/register', {
      method: 'POST',
      body: input,
      public: true,
    }),

  verifyOtp: (email: string, otp: string) =>
    apiRequest<{ message: string }>('/auth/verify-otp', { method: 'POST', body: { email, otp }, public: true }),

  async logout() {
    const refreshToken = getRefreshToken();
    try {
      await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } });
    } finally {
      clearTokens();
    }
  },
};
