import type { LoginResponse } from './types';

import type { AuthUser } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const ACCESS_TOKEN_KEY = 'medcore_access_token';
const REFRESH_TOKEN_KEY = 'medcore_refresh_token';
const USER_KEY = 'medcore_user';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * The backend has no GET /auth/me endpoint yet, so there's no way to
 * re-fetch the logged-in user's display info from a stored token
 * alone after a page refresh. Persisting the login response's user
 * object is a working stopgap; a real /auth/me would be more robust
 * (reflects live isActive status rather than a stale local copy) —
 * worth adding to the backend rather than treating this as settled.
 */
export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshPromise: Promise<boolean> | null = null;

/**
 * Rotates the refresh token exactly the way the backend expects —
 * POST /auth/refresh with the current refresh token, get back a new
 * pair, store both. A single in-flight refresh is shared (not
 * re-triggered per concurrent 401) so two requests failing at once
 * don't race each other into a double rotation, which the backend's
 * reuse-detection would treat as token theft and revoke the whole
 * session.
 */
async function refreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        return false;
      }
      const data: LoginResponse = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      clearTokens();
      return false;
    }
  })();

  const result = await refreshPromise;
  refreshPromise = null;
  return result;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skips attaching an Authorization header — for @Public() routes like login/register/health. */
  public?: boolean;
}

/**
 * Every domain method in this file goes through here. On a 401 from
 * a non-public request, attempts exactly one silent refresh-and-retry
 * before giving up — mirrors the access token's short TTL (15m) being
 * an expected, routine event during normal use, not an error state.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, public: isPublic = false } = options;

  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!isPublic) {
      const token = getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !isPublic) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const errBody = await res.json();
      message = errBody.message ?? message;
    } catch {
      // response wasn't JSON — fall back to statusText
    }
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
