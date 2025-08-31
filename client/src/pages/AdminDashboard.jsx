import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const logout = () => {
    clearToken();
    navigate("/admin/login");
  };
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-center">
            {/* Left: Brand (same as public header) */}
            <div className="absolute left-0">
              <Link to="/" className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded bg-blue-600 font-bold text-white">LT</div>
                <span className="text-lg font-semibold text-gray-900">LibroTrack</span>
              </Link>
            </div>
            {/* Center title */}
            <h1 className="text-lg font-semibold text-slate-900">Admin Dashboard</h1>
            {/* Right: logout */}
            <div className="absolute right-0">
              <button
                onClick={logout}
                className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Welcome</h2>
              <p className="mt-1 text-sm text-slate-600">
                Use the tools below to manage your library’s catalog and operations.
              </p>
            </div>
            {/* Action slot intentionally empty to keep focus on tiles */}
            <div />
          </div>

          {/* Quick stats placeholder (future) */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Primary tile becomes a Book Management button */}
            <button
              onClick={() => navigate('/admin/books')}
              className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <div className="text-xs uppercase tracking-wide text-blue-700">Catalog</div>
              <div className="mt-1 text-2xl font-semibold text-blue-900">Book Management</div>
              <div className="text-blue-800/80">Create, edit, and organize your collection.</div>
            </button>
            <div className="rounded-xl border border-slate-200 p-4 opacity-70">
              <div className="text-xs uppercase tracking-wide text-slate-500">Members</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">Coming soon</div>
              <div className="text-slate-500">Manage library members and permissions.</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 opacity-70">
              <div className="text-xs uppercase tracking-wide text-slate-500">Reports</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">Coming soon</div>
              <div className="text-slate-500">Track loans, fines, and stock levels.</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}