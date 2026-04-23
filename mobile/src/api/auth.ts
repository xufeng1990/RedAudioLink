import { apiRequest, tokenStore, type StoredUser } from './client';

export type AuthResponse = {
  token: string;
  user: StoredUser;
};

export async function registerApi(input: {
  email: string;
  password: string;
  businessId: string;
}): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: input,
    auth: false,
  });
  await tokenStore.set(data.token);
  await tokenStore.setUser(data.user);
  return data;
}

export async function loginApi(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: input,
    auth: false,
  });
  await tokenStore.set(data.token);
  await tokenStore.setUser(data.user);
  return data;
}

export async function fetchMe(): Promise<StoredUser | null> {
  await tokenStore.ready();
  const tok = tokenStore.get();
  if (!tok) return null;
  try {
    const data = await apiRequest<{ user: StoredUser }>('/api/auth/me');
    await tokenStore.setUser(data.user);
    return data.user;
  } catch {
    await tokenStore.clear();
    return null;
  }
}

/**
 * Authentication state is determined by whether a valid token exists
 * (verified server-side via /api/auth/me) — NOT by the email value.
 */
export async function isAuthenticated(): Promise<boolean> {
  await tokenStore.ready();
  if (!tokenStore.get()) return false;
  const user = await fetchMe();
  return !!user;
}

export function getAuthToken(): string | null {
  return tokenStore.get();
}

export async function logoutApi(): Promise<void> {
  await tokenStore.clear();
}
