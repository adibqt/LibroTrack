import React, { useEffect, useMemo, useState } from "react";
import { AuthStore } from "../lib/auth";
import { AuthAPI, LoansAPI } from "../lib/api";

function daysBetween(a, b) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.floor((a - b) / MS);
}

function classNames(...c) {
  return c.filter(Boolean).join(" ");
}

export default function LoanHistory() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = AuthStore.getToken();
        if (!token) {
          setError("Please sign in to view history.");
          return;
        }
        const meRes = await AuthAPI.me(token);
        if (cancelled) return;
        setMe(meRes);
        // Fetch all statuses
        const [active, returned, lost] = await Promise.all([
          LoansAPI.listForUser(meRes.user_id, { status: "ISSUED" }, token),
          LoansAPI.listForUser(meRes.user_id, { status: "RETURNED" }, token),
          LoansAPI.listForUser(meRes.user_id, { status: "LOST" }, token),
        ]);
        const merged = [
          ...(active || []),
          ...(returned || []),
          ...(lost || []),
        ];
        if (!cancelled) setLoans(merged);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Frontend default constraint: 30 days max borrowing window.
  const rows = useMemo(() => {
    const now = new Date();
    return (loans || []).map((ln) => {
      const due = ln.due_date ? new Date(ln.due_date) : null;
      const issue = ln.issue_date ? new Date(ln.issue_date) : null;
      const returned = ln.return_date ? new Date(ln.return_date) : null;
      // Backend sets default 14-day due_date already; but if missing or clearly > 30 days, apply 30-day front-end rule for badge/fine display
      const fallbackDue = issue
        ? new Date(issue.getTime() + 30 * 24 * 3600 * 1000)
        : null;
      const effectiveDue = due || fallbackDue;
      let daysLate = 0;
      if (effectiveDue) {
        const compareDate = returned || now;
        daysLate = Math.max(0, daysBetween(compareDate, effectiveDue));
      }
      const isLate = daysLate > 0;
      const estFine = isLate ? daysLate * 10 : 0; // ৳10 per day late (display only)
      return { ...ln, effectiveDue, isLate, daysLate, estFine };
    });
  }, [loans]);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Borrowing History</h1>
        <p className="mt-1 text-gray-600">
          All your borrowed books, both active and returned. Overdue status and
          estimated fines are shown for convenience.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Issued</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium">Returned</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Overdue</th>
                <th className="px-4 py-2 font-medium text-right">Est. Fine</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No borrowing history.
                  </td>
                </tr>
              ) : (
                rows.map((ln) => (
                  <tr key={ln.loan_id} className="border-t">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {ln.title}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {new Date(ln.issue_date).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {ln.effectiveDue
                        ? new Date(ln.effectiveDue).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {ln.return_date
                        ? new Date(ln.return_date).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={classNames(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          ln.status === "ISSUED" && "bg-blue-100 text-blue-700",
                          ln.status === "RETURNED" &&
                            "bg-green-100 text-green-700",
                          ln.status === "LOST" && "bg-red-100 text-red-700"
                        )}
                      >
                        {ln.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {ln.isLate ? (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Late by {ln.daysLate} day
                          {ln.daysLate !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">On time</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {ln.estFine > 0 ? (
                        <span className="font-semibold text-red-700">
                          ৳{ln.estFine.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-500">৳0.00</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
