import React, { useEffect, useState } from "react";
import { AuthStore } from "../lib/auth";
import { AuthAPI, LoansAPI } from "../lib/api";

function classNames(...c) {
  return c.filter(Boolean).join(" ");
}

export default function MyLoans() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loans, setLoans] = useState([]);
  const [status, setStatus] = useState("ISSUED");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = AuthStore.getToken();
        if (!token) {
          setError("Please sign in to view your loans.");
          return;
        }
        const meRes = await AuthAPI.me(token);
        if (cancelled) return;
        setMe(meRes);
        const data = await LoansAPI.listForUser(
          meRes.user_id,
          { status },
          token
        );
        if (!cancelled) setLoans(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load loans");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const doReturn = async (loan) => {
    setToast(null);
    try {
      const token = AuthStore.getToken();
      await LoansAPI.returnLoan(loan.loan_id, token);
      setToast({ type: "success", msg: "Book returned." });
      // Refresh list
      const data = await LoansAPI.listForUser(me.user_id, { status }, token);
      setLoans(Array.isArray(data) ? data : []);
    } catch (e) {
      setToast({ type: "error", msg: e?.message || "Return failed" });
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Loans</h1>
        <p className="mt-1 text-gray-600">
          View and manage your borrowed books.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-gray-700">Filter:</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="ISSUED">Active</option>
          <option value="RETURNED">Returned</option>
          <option value="LOST">Lost</option>
        </select>
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
                <th className="px-4 py-2 font-medium">Issue Date</th>
                <th className="px-4 py-2 font-medium">Due Date</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No loans.
                  </td>
                </tr>
              ) : (
                loans.map((ln) => (
                  <tr key={ln.loan_id} className="border-t">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {ln.title}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {new Date(ln.issue_date).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {new Date(ln.due_date).toLocaleDateString()}
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
                    <td className="px-4 py-2 text-right">
                      {ln.status === "ISSUED" && (
                        <button
                          onClick={() => doReturn(ln)}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
                        >
                          Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div
          className={classNames(
            "fixed bottom-4 right-4 z-30 rounded-md px-4 py-2 shadow",
            toast.type === "success" && "bg-green-600 text-white",
            toast.type === "error" && "bg-red-600 text-white"
          )}
        >
          {toast.msg}
        </div>
      )}
    </section>
  );
}
