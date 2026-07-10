"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  LayoutDashboard,
  Users,
  FolderKey,
  DollarSign,
  Activity,
  BarChart3,
  AlertTriangle,
  MessageSquare,
  ScrollText,
  LogOut,
  Shield,
  Play,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/demo-analytics", label: "Demo Funnel", icon: Play },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/projects", label: "Projects", icon: FolderKey },
      { href: "/pricing", label: "Pricing", icon: DollarSign },
      { href: "/feedback", label: "Feedback", icon: MessageSquare },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/system", label: "System", icon: Activity },
      { href: "/incidents", label: "Incidents", icon: AlertTriangle },
      { href: "/audit-log", label: "Audit Log", icon: ScrollText },
    ],
  },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Drawer overlay (mobile only) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — off-canvas drawer below lg, static column on lg+ */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-56 shrink-0 border-r border-zinc-800/40 bg-zinc-950 flex flex-col transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:transition-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/20 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-zinc-300 uppercase tracking-[0.15em] block leading-none">
                AgentCost
              </span>
              <span className="text-[10px] text-zinc-600 font-mono block mt-0.5">
                Control Plane
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-1">
              <div className="px-2.5 pt-3 pb-1.5 text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2.5 lg:py-1.5 rounded-lg text-[13px] transition-colors",
                        isActive
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/15"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-zinc-800/40 px-3 py-3">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] font-medium text-zinc-400 uppercase">
              {user?.email?.charAt(0) || "A"}
            </div>
            <div className="text-[11px] text-zinc-500 truncate flex-1">
              {user?.email}
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors w-full px-0.5 py-2 lg:py-0"
          >
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-800/40 bg-zinc-950 px-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-linear-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/20 flex items-center justify-center">
              <Shield className="w-3 h-3 text-blue-400" />
            </div>
            <span className="text-[11px] font-mono text-zinc-300 uppercase tracking-[0.15em]">
              AgentCost
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-zinc-950">{children}</main>
      </div>
    </div>
  );
}
