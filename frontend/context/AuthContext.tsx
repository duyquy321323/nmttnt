"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { api, clearToken, getToken, setToken } from "@/lib/api";
import type { AuthUser, LoginResponse, UserRole } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function redirectByRole(role: UserRole, mustChangePassword: boolean) {
  if (mustChangePassword) {
    if (role === "teacher") return "/teacher/change-password";
    if (role === "student") return "/student/change-password";
  }
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher/documents";
  if (role === "student") return "/";
  return "/";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await api.get<AuthUser>("/api/v1/auth/me", true);
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await api.post<LoginResponse>("/api/v1/auth/login", {
        username,
        password,
      });
      setToken(response.access_token);
      await refreshUser();
      router.push(redirectByRole(response.role, response.must_change_password));
      return response;
    },
    [refreshUser, router],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useRequireRole(role: UserRole) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace(redirectByRole(user.role, user.must_change_password));
      return;
    }
    if (role === "teacher" && user.must_change_password) {
      router.replace("/teacher/change-password");
    }
    if (role === "student" && user.must_change_password) {
      router.replace("/student/change-password");
    }
  }, [user, loading, role, router]);

  return { user, loading };
}
