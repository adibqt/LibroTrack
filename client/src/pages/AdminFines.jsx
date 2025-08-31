import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth";
import { FinesAPI, MembersAPI } from "../lib/api";

export default function AdminFines() {
  const navigate = useNavigate();
  const logout = () => { clearToken(); navigate("/admin/login"); };
  const goBack = () => navigate("/admin");

  const [fines, setFines] = useState([]);
  const [filterUser, setFilterUser] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [creating, setCreating] = useState({ user_id: "", amount: "", fine_type: "OVERDUE" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const params = {};
      if (filterUser) params.user_id = filterUser;
      if (filterStatus) params.status = filterStatus;
      const data = await FinesAPI.list(params);
      setFines(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createFine = async () => {
    setLoading(true); setError("");
    try {
      const payload = {
        user_id: Number(creating.user_id),
        amount: Number(creating.amount),
        fine_type: creating.fine_type || "OTHER",
      };
      await FinesAPI.create(payload);
      setCreating({ user_id: "", amount: "", fine_type: "OVERDUE" });
      await load();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const settle = async (fineId) => { setLoading(true); setError(""); try { await FinesAPI.settle(fineId); await load(); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  const waive = async (fineId) => { setLoading(true); setError(""); try { await FinesAPI.waive(fineId); await load(); } catch (e) { setError(e.message); } finally { setLoading(false); } };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-center">
            <div className="absolute left-0 flex items-center gap-3">
              <button onClick={goBack} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Back</button>
              <div className="grid h-9 w-9 place-items-center rounded bg-blue-600 font-bold text-white">LT</div>
              <span className="text-lg font-semibold text-gray-900">LibroTrack</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Fine Management</h1>
            <div className="absolute right-0">
              <button onClick={logout} className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Filters</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">User ID</label>
              <input value={filterUser} onChange={(e)=>setFilterUser(e.target.value)} className="mt-1 w-40 rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Status</label>
              <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="mt-1 w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Any</option>
                <option>UNPAID</option>
                <option>PAID</option>
                <option>WAIVED</option>
              </select>
            </div>
            <button onClick={load} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">Apply</button>
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Create Fine</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">User ID</label>
              <input value={creating.user_id} onChange={(e)=>setCreating(v=>({...v,user_id:e.target.value}))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Amount</label>
              <input type="number" min="0" value={creating.amount} onChange={(e)=>setCreating(v=>({...v,amount:e.target.value}))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Type</label>
              <select value={creating.fine_type} onChange={(e)=>setCreating(v=>({...v,fine_type:e.target.value}))} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                <option>OVERDUE</option>
                <option>DAMAGE</option>
                <option>LOST</option>
                <option>OTHER</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={createFine} className="w-full rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Create</button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Fines</h2>
          <div className="max-h-[60vh] overflow-auto rounded border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Fine ID</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">User</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Amount</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {fines.map(f => (
                  <tr key={f.fine_id}>
                    <td className="px-3 py-2">{f.fine_id}</td>
                    <td className="px-3 py-2">{f.user_id}</td>
                    <td className="px-3 py-2">{f.fine_type}</td>
                    <td className="px-3 py-2">{f.amount}</td>
                    <td className="px-3 py-2">{f.status}</td>
                    <td className="px-3 py-2 text-right">
                      {f.status === 'UNPAID' ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={()=>settle(f.fine_id)} className="rounded-md border border-green-600 bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Settle</button>
                          <button onClick={()=>waive(f.fine_id)} className="rounded-md border border-amber-600 bg-amber-500 px-2 py-1 text-xs text-white hover:bg-amber-600">Waive</button>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {fines.length === 0 && (
                  <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>{loading ? 'Loading…' : 'No fines found.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
