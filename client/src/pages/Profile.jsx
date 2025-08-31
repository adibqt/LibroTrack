import React, { useEffect, useState } from "react";
import { AuthAPI } from "../lib/api";
import { AuthStore } from "../lib/auth";
import { Link, useNavigate } from "react-router-dom";

export default function Profile() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = AuthStore.getToken();
        if (!token) {
          setError("Please sign in to view your profile.");
          return;
        }
        const meRes = await AuthAPI.me(token);
        if (!cancelled) setMe(meRes);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = () => {
    AuthStore.clear();
    navigate("/login");
  };

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-gray-600">Manage your account & activity.</p>
        </div>
        <button
          onClick={signOut}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : me ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Account
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Username" value={me.username} />
                <Field label="Email" value={me.email} />
                <Field label="First name" value={me.first_name || "—"} />
                <Field label="Last name" value={me.last_name || "—"} />
                <Field label="Phone" value={me.phone || "—"} />
                <Field label="Address" value={me.address || "—"} full />
                <Field label="User type" value={me.user_type} />
                <Field label="Status" value={me.status} />
                <Field
                  label="Member since"
                  value={new Date(me.created_at).toLocaleString()}
                  full
                />
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Borrowing
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Metric label="Max allowed" value={me.max_books_allowed} />
                <Metric
                  label="Currently borrowed"
                  value={me.current_books_borrowed}
                />
                <Metric
                  label="Total fines"
                  value={`$${Number(me.total_fines || 0).toFixed(2)}`}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  to="/my-loans"
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  My Loans
                </Link>
                <Link
                  to="/history"
                  className="rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  History
                </Link>
                <Link
                  to="/fines"
                  className="rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  Fines
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Quick Actions
              </h2>
              <div className="flex flex-col gap-2">
                <Link
                  to="/catalog"
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Browse Catalog
                </Link>
                <Link
                  to="/members"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Members
                </Link>
                <button
                  onClick={signOut}
                  className="rounded-md border border-red-600 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, value, full }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-gray-900">{String(value ?? "")}</div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}
