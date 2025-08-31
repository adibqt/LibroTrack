import React from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const logout = () => {
    clearToken();
    navigate("/admin/login");
  };
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <button onClick={logout} className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-900">Logout</button>
        </div>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-700">Welcome, admin. We’ll add management screens here.</p>
        </div>
      </div>
    </div>
  );
}