"use client";

import { useState, FormEvent } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Shield, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login, isLoading } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Initializing...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950 relative overflow-hidden">
      {/* Subtle background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.015)_1px,transparent_1px)] bg-size-[64px_64px]" />

      {/* Radial glow behind form */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-blue-500/4 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Brand header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-linear-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/20 mb-5">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-[0.2em]">
              AgentCost
            </span>
          </div>
          <h1 className="text-xl font-semibold text-zinc-50 tracking-tight">
            Admin Control Plane
          </h1>
          <p className="text-sm text-zinc-500 mt-1.5">
            Restricted to authorized operators
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 text-sm bg-red-500/8 border border-red-500/20 rounded-xl text-red-400 flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-red-400 mt-2 shrink-0" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-[11px] font-medium text-zinc-400 mb-2 uppercase tracking-wider"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              placeholder="admin@agentcost.dev"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-medium text-zinc-400 mb-2 uppercase tracking-wider"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Authenticating...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="mt-8 text-[11px] text-zinc-600 text-center">
          Superuser credentials required to access this interface
        </p>
      </div>
    </div>
  );
}
