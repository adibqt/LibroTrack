import React, { useEffect, useMemo, useState } from "react";
import { AuthAPI, FinesAPI } from "../lib/api";
import { AuthStore } from "../lib/auth";

function classNames(...c) {
  return c.filter(Boolean).join(" ");
}

export default function Fines() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fines, setFines] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = AuthStore.getToken();
        if (!token) {
          setError("Please sign in to view fines.");
          return;
        }
        const meRes = await AuthAPI.me(token);
        if (cancelled) return;
        setMe(meRes);
        const list = await FinesAPI.listForUser(meRes.user_id, token);
        if (!cancelled) setFines(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load fines");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const unpaid = fines.filter((f) => f.status === "UNPAID");
    const paid = fines.filter((f) => f.status === "PAID");
    const sumUnpaid = unpaid.reduce((s, f) => s + Number(f.amount || 0), 0);
    const sumPaid = paid.reduce((s, f) => s + Number(f.amount || 0), 0);
    return { sumUnpaid, sumPaid };
  }, [fines]);

  const pay = async (fine) => {
    setToast(null);
    try {
      const token = AuthStore.getToken();
      await FinesAPI.pay(fine.fine_id, token);
      setToast({ type: "success", msg: "Fine settled." });
      // refresh
      const list = await FinesAPI.listForUser(me.user_id, token);
      setFines(Array.isArray(list) ? list : []);
    } catch (e) {
      setToast({ type: "error", msg: e?.message || "Payment failed" });
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fines</h1>
        <p className="mt-1 text-gray-600">Review and settle your fines.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Unpaid Total</div>
          <div className="text-2xl font-semibold text-red-700">
            ৳{totals.sumUnpaid.toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Paid Total</div>
          <div className="text-2xl font-semibold text-gray-900">
            ৳{totals.sumPaid.toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Count</div>
          <div className="text-2xl font-semibold text-gray-900">
            {fines.length}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Fine Date</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fines.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No fines.
                  </td>
                </tr>
              ) : (
                fines.map((f) => (
                  <tr key={f.fine_id} className="border-t">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {f.fine_type}
                    </td>
                    <td className="px-4 py-2 text-gray-900">
                      ৳{Number(f.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {f.description || "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {f.fine_date
                        ? new Date(f.fine_date).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={classNames(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          f.status === "UNPAID" && "bg-red-100 text-red-700",
                          f.status === "PAID" && "bg-green-100 text-green-700"
                        )}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {f.status === "UNPAID" ? (
                        <button
                          onClick={() => pay(f)}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
                        >
                          Pay
                        </button>
                      ) : (
                        <span className="text-gray-500">—</span>
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
