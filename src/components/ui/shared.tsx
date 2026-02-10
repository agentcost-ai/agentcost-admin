import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Search } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  StatCard                                                                   */
/* -------------------------------------------------------------------------- */

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { value: number; label?: string };
  className?: string;
}

export function StatCard({
  label,
  value,
  sub,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative px-5 py-4 rounded-xl border border-zinc-800/50 bg-zinc-900/40 hover:border-zinc-700/60 hover:bg-zinc-900/60",
        className,
      )}
    >
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-semibold text-zinc-50 tracking-tight font-mono">
          {value}
        </div>
        {trend && (
          <span
            className={cn(
              "text-[11px] font-medium",
              trend.value >= 0 ? "text-emerald-400" : "text-red-400",
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%{trend.label ? ` ${trend.label}` : ""}
          </span>
        )}
      </div>
      {sub && <div className="text-[11px] text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  PageHeader                                                                 */
/* -------------------------------------------------------------------------- */

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-zinc-500 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  DataTable components                                                       */
/* -------------------------------------------------------------------------- */

interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div
      className={cn(
        "border border-zinc-800/50 rounded-xl overflow-hidden bg-zinc-900/30",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full">{children}</table>
      </div>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-zinc-900/60 border-b border-zinc-800/50">
      {children}
    </thead>
  );
}

export function Th({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-[11px] uppercase tracking-wider text-zinc-500 font-medium",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-4 py-3 text-sm text-zinc-300 border-t border-zinc-800/30",
        className,
      )}
    >
      {children}
    </td>
  );
}

/* -------------------------------------------------------------------------- */
/*  Badge                                                                      */
/* -------------------------------------------------------------------------- */

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-zinc-800/80 text-zinc-300 border-zinc-700/50",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-red-500/10 text-red-400 border-red-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  ConfirmModal                                                               */
/* -------------------------------------------------------------------------- */

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  loading,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <h3 className="text-sm font-semibold text-zinc-100 mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50",
              confirmVariant === "danger"
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white",
            )}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  EmptyState / Loading                                                       */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-sm text-zinc-500",
        className,
      )}
    >
      <div className="w-10 h-10 mb-3 rounded-full bg-zinc-800/60 flex items-center justify-center">
        <Search className="w-4 h-4 text-zinc-600" />
      </div>
      {message}
    </div>
  );
}

export function LoadingState({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-16", className)}>
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
        Loading...
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pagination                                                                 */
/* -------------------------------------------------------------------------- */

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
}

export function Pagination({
  total,
  limit,
  offset,
  onPageChange,
}: PaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/40">
      <div className="text-xs text-zinc-500">
        Showing {offset + 1}--{Math.min(offset + limit, total)} of {total}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-zinc-600 mr-2">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(offset + limit)}
          disabled={offset + limit >= total}
          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SearchInput                                                                */
/* -------------------------------------------------------------------------- */

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SectionCard - reusable section wrapper                                     */
/* -------------------------------------------------------------------------- */

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  children,
  actions,
  className,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "border border-zinc-800/50 rounded-xl bg-zinc-900/30 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/40">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
            {title}
          </h3>
          {description && (
            <p className="text-[11px] text-zinc-600 mt-0.5">{description}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
