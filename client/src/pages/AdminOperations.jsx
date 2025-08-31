import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth";
import { ReservationsAPI, LoansAPI } from "../lib/api";

export default function AdminOperations() {
  const navigate = useNavigate();
  const logout = () => {
    clearToken();
    navigate("/", { replace: true });
  };
  const goBack = () => navigate("/admin");

  const [userId, setUserId] = useState("");
  const [bookId, setBookId] = useState("");
  const [reservationId, setReservationId] = useState("");
  const [loanId, setLoanId] = useState("");
  const [expiryDays, setExpiryDays] = useState("7");
  const [priority, setPriority] = useState("1");
  const [dueDays, setDueDays] = useState("14");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const r = await fn();
      setResult(JSON.stringify(r, null, 2));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Reservation lifecycle */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Reservations
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  User ID
                </label>
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Book ID
                </label>
                <input
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Expiry Days
                </label>
                <input
                  type="number"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Priority
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  return run(() =>
                    ReservationsAPI.create({
                      user_id: Number(userId),
                      book_id: Number(bookId),
                      expiry_days: Number(expiryDays) || null,
                      priority_level: Number(priority) || null,
                    })
                  );
                }}
                className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
              <input
                placeholder="Reservation ID"
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  return run(() =>
                    ReservationsAPI.cancel(Number(reservationId))
                  );
                }}
                className="rounded-md border border-amber-600 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  return run(() =>
                    ReservationsAPI.fulfill(Number(reservationId))
                  );
                }}
                className="rounded-md border border-emerald-600 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                Fulfill
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  return run(() => ReservationsAPI.expireDue());
                }}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Expire due
              </button>
            </div>
          </section>

          {/* Loans orchestration */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Loans</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  User ID
                </label>
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Book ID
                </label>
                <input
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Due Days
                </label>
                <input
                  type="number"
                  value={dueDays}
                  onChange={(e) => setDueDays(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  return run(() =>
                    LoansAPI.issue({
                      user_id: Number(userId),
                      book_id: Number(bookId),
                      due_days: Number(dueDays) || null,
                    })
                  );
                }}
                className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Issue
              </button>
              <input
                placeholder="Loan ID"
                value={loanId}
                onChange={(e) => setLoanId(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  return run(() => LoansAPI.returnLoan(Number(loanId)));
                }}
                className="rounded-md border border-emerald-600 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                Return
              </button>
            </div>
          </section>
        </div>

        {/* Result */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Result</h2>
          <pre className="max-h-64 overflow-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
            {result || "(none)"}
          </pre>
        </section>
      </main>
    </div>
  );
}
