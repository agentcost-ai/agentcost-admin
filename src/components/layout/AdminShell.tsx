"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-800/40 bg-zinc-950 flex flex-col">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-zinc-800/40">
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
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors",
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
            className="flex items-center gap-2 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors w-full px-0.5"
          >
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-zinc-950">{children}</main>
    </div>
  );
}
