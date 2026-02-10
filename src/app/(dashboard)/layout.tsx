"use client";

import { useAdminAuth } from "@/contexts/AdminAuthContext";
import AdminShell from "@/components/layout/AdminShell";
import { LoadingState } from "@/components/ui/shared";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Auth context will redirect to /login
  }

  return <AdminShell>{children}</AdminShell>;
}
