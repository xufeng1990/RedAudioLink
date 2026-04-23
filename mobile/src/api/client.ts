import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_API_BASE = (() => {
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return 'http://localhost:5000';
})();

export const API_BASE: string =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) || DEFAULT_API_BASE;

const TOKEN_KEY = 'red_auth_token';
const USER_KEY = 'red_auth_user';

export type StoredUser = {
  id: string;
  email: string;
  businessId: string;
};

const isWeb = Platform.OS === 'web';

let cachedToken: string | null = null;
let cachedUser: StoredUser | null = null;
let initialized = false;

async function initialize(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    if (isWeb && typeof localStorage !== 'undefined') {
      cachedToken = localStorage.getItem(TOKEN_KEY);
      const raw = localStorage.getItem(USER_KEY);
      cachedUser = raw ? (JSON.parse(raw) as StoredUser) : null;
    } else {
      cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const raw = await AsyncStorage.getItem(USER_KEY);
      cachedUser = raw ? (JSON.parse(raw) as StoredUser) : null;
    }
  } catch {
    cachedToken = null;
    cachedUser = null;
  }
}

export const tokenStore = {
  async ready(): Promise<void> {
    await initialize();
  },
  get(): string | null {
    return cachedToken;
  },
  async set(token: string): Promise<void> {
    cachedToken = token;
    if (isWeb && typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  },
  async clear(): Promise<void> {
    cachedToken = null;
    cachedUser = null;
    if (isWeb && typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } else {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }
  },
  getUser(): StoredUser | null {
    return cachedUser;
  },
  async setUser(user: StoredUser): Promise<void> {
    cachedUser = user;
    const raw = JSON.stringify(user);
    if (isWeb && typeof localStorage !== 'undefined') {
      localStorage.setItem(USER_KEY, raw);
    } else {
      await AsyncStorage.setItem(USER_KEY, raw);
    }
  },
};

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  await tokenStore.ready();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.auth !== false) {
    const tok = tokenStore.get();
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message || `Request failed (${res.status})`);
  }
  return data as T;
}
