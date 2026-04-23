import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { adminApi, getAdminToken, setAdminToken } from "./api";

type AdminMe = {
  id: string;
  username: string;
  displayName: string;
  status: string;
  roles: { id: string; name: string; permissions: string[] }[];
};

type AuthState = {
  loading: boolean;
  admin: AdminMe | null;
  permissions: Set<string>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  hasPerm: (p: string) => boolean;
};

const Ctx = createContext<AuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());

  async function refresh() {
    const token = getAdminToken();
    if (!token) {
      setAdmin(null);
      setPermissions(new Set());
      setLoading(false);
      return;
    }
    try {
      const me = await adminApi<{ admin: AdminMe; permissions: string[] }>(
        "GET",
        "/auth/me",
      );
      setAdmin(me.admin);
      setPermissions(new Set(me.permissions));
    } catch {
      setAdminToken(null);
      setAdmin(null);
      setPermissions(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(username: string, password: string) {
    const out = await adminApi<{ token: string; admin: AdminMe }>(
      "POST",
      "/auth/login",
      { username, password },
    );
    setAdminToken(out.token);
    await refresh();
  }

  function logout() {
    setAdminToken(null);
    setAdmin(null);
    setPermissions(new Set());
  }

  function hasPerm(p: string) {
    return permissions.has("*") || permissions.has(p);
  }

  return (
    <Ctx.Provider value={{ loading, admin, permissions, login, logout, refresh, hasPerm }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return v;
}
