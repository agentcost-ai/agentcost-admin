"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { adminLogin, verifyAdmin } from "@/lib/api";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  is_superuser: boolean;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined,
);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("admin_access_token");
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Verify the token is still valid and belongs to a superuser
        const admin = await verifyAdmin();
        setUser(admin);
      } catch {
        // Token invalid or not superuser -- clear
        localStorage.removeItem("admin_access_token");
        localStorage.removeItem("admin_refresh_token");
        localStorage.removeItem("admin_user");
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = pathname === "/login";

    if (!user && !isLoginPage) {
      router.replace("/login");
    } else if (user && isLoginPage) {
      router.replace("/");
    }
  }, [user, isLoading, pathname, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await adminLogin(email, password);

      localStorage.setItem("admin_access_token", data.access_token);
      localStorage.setItem("admin_refresh_token", data.refresh_token);
      localStorage.setItem("admin_user", JSON.stringify(data.user));

      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        is_superuser: data.user.is_superuser ?? true,
      });

      router.replace("/");
    },
    [router],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("admin_access_token");
    localStorage.removeItem("admin_refresh_token");
    localStorage.removeItem("admin_user");
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextType {
  const ctx = useContext(AdminAuthContext);
  if (!ctx)
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
