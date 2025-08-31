import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken, getToken } from "../lib/auth";
import { ReservationsAPI, LoansAPI } from "../lib/api";

export default function AdminOperations() {
  const navigate = useNavigate();
  const logout = () => {
    clearToken();
    navigate("/", { replace: true });
  };
  const goBack = () => navigate("/admin");

  const [pendingReservations, setPendingReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  // Load pending reservations
  const loadPendingReservations = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const reservations = await ReservationsAPI.list({ status: "PENDING" }, token);
      setPendingReservations(reservations || []);
    } catch (e) {
      setError(e.message || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingReservations();
  }, []);

  const handleApprove = async (reservationId) => {
    try {
      const token = getToken();
      await ReservationsAPI.fulfill(reservationId, token);
      setToast({ type: "success", msg: "Reservation approved and fulfilled successfully." });
      await loadPendingReservations();
    } catch (e) {
      setToast({ type: "error", msg: e.message || "Failed to approve reservation" });
    }
  };

  const handleDeny = async (reservationId) => {
    try {
      const token = getToken();
      await ReservationsAPI.cancel(reservationId, token);
      setToast({ type: "success", msg: "Reservation denied and cancelled." });
      await loadPendingReservations();
    } catch (e) {
      setToast({ type: "error", msg: e.message || "Failed to deny reservation" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-center">
            <div className="absolute left-0 flex items-center gap-3">
              <button
                onClick={goBack}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <div className="grid h-9 w-9 place-items-center rounded bg-blue-600 font-bold text-white">
                LT
              </div>
              <span className="text-lg font-semibold text-gray-900">
                LibroTrack
              </span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">
              Admin Operations
            </h1>
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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {toast && (
          <div className={`mb-4 rounded border px-3 py-2 text-sm ${
            toast.type === "success" 
              ? "border-green-200 bg-green-50 text-green-800"
              : toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-yellow-200 bg-yellow-50 text-yellow-800"
          }`}>
            {toast.msg}
          </div>
        )}

        {/* Pending Reservations */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Pending Reservations
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Review and approve or deny book reservation requests from users.
                </p>
              </div>
              <button
                onClick={loadPendingReservations}
                disabled={loading}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading reservations...</div>
            ) : pendingReservations.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No pending reservations found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Book
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Requested
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pendingReservations.map((reservation) => (
                      <tr key={reservation.reservation_id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {reservation.user.first_name} {reservation.user.last_name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {reservation.user.username}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {reservation.book.title}
                            </div>
                            <div className="text-sm text-slate-500">
                              ISBN: {reservation.book.isbn}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-900">
                          {new Date(reservation.reservation_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-900">
                          {reservation.expiry_date 
                            ? new Date(reservation.expiry_date).toLocaleDateString()
                            : "No expiry"
                          }
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            reservation.priority_level === 1 
                              ? "bg-green-100 text-green-800"
                              : reservation.priority_level === 2
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {reservation.priority_level === 1 ? "Normal" : 
                             reservation.priority_level === 2 ? "High" : "Urgent"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(reservation.reservation_id)}
                              className="rounded-md bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDeny(reservation.reservation_id)}
                              className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              Deny
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
