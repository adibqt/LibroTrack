import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth";
import { MembersAPI } from "../lib/api";

export default function AdminMemberManager() {
  const navigate = useNavigate();
  const logout = () => { clearToken(); navigate("/admin/login"); };
  const goBack = () => navigate("/admin");

  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadMembers = async () => {
    setLoading(true); setError("");
    try {
      const data = await MembersAPI.list(query ? { q: query } : undefined);
      setMembers(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadDetails = async (userId) => {
    if (!userId) { setProfile(null); setReservations([]); setLoans([]); return; }
    setLoading(true); setError("");
    try {
      const [p, rh, lh] = await Promise.all([
        MembersAPI.get(userId),
        MembersAPI.reservationHistory(userId, { limit: 50 }),
        MembersAPI.loansHistory(userId, { limit: 50 }),
      ]);
      setProfile(p);
      setReservations(rh);
      setLoans(lh);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadMembers(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m =>
      [m.username, m.email, m.first_name, m.last_name].some(x => (x||"").toLowerCase().includes(q))
    );
  }, [members, query]);

  const onSelect = (m) => { setSelected(m); loadDetails(m.user_id); };

  const onField = (k, v) => setProfile(prev => ({ ...prev, [k]: v }));

  const saveProfile = async () => {
    if (!profile) return;
    setLoading(true); setError("");
    try {
      const payload = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        user_type: profile.user_type,
        status: profile.status,
        max_books_allowed: Number(profile.max_books_allowed) || 0,
      };
      await MembersAPI.update(profile.user_id, payload);
      await loadMembers();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const deleteMember = async () => {
    if (!profile) return;
    const sure = window.confirm("Delete this member? This cannot be undone.");
    if (!sure) return;
    setLoading(true); setError("");
    try {
      await MembersAPI.remove(profile.user_id);
      setProfile(null); setSelected(null); setReservations([]); setLoans([]);
      await loadMembers();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-center">
            <div className="absolute left-0 flex items-center gap-3">
              <button onClick={goBack} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Back</button>
              <div className="grid h-9 w-9 place-items-center rounded bg-blue-600 font-bold text-white">LT</div>
              <span className="text-lg font-semibold text-gray-900">LibroTrack</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Member Management</h1>
            <div className="absolute right-0">
              <button onClick={logout} className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: members list */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadMembers(); }}
                placeholder="Search by name, username, or email"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button onClick={loadMembers} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">Search</button>
              <button onClick={() => { setQuery(""); loadMembers(); }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">Refresh</button>
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">ID</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((m) => (
                    <tr key={m.user_id} className={selected?.user_id === m.user_id ? "bg-blue-50" : "hover:bg-slate-50"}>
                      <td className="px-3 py-2 text-slate-700">{m.user_id}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{m.first_name} {m.last_name}</div>
                        <div className="text-slate-500">{m.username}</div>
                      </td>
                      <td className="px-3 py-2">{m.email}</td>
                      <td className="px-3 py-2">{m.user_type}</td>
                      <td className="px-3 py-2">{m.status}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => onSelect(m)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50">View</button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>{loading ? "Loading..." : "No members found."}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Right: details */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {!profile ? (
              <div className="text-slate-500">Select a member to view details.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={saveProfile} className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">Save</button>
                    <button onClick={deleteMember} className="rounded-md border border-red-600 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Delete</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">User ID</label>
                    <input disabled value={profile.user_id} className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">First Name</label>
                    <input value={profile.first_name||""} onChange={(e)=>onField('first_name', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Last Name</label>
                    <input value={profile.last_name||""} onChange={(e)=>onField('last_name', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Email</label>
                    <input type="email" value={profile.email||""} onChange={(e)=>onField('email', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Phone</label>
                    <input value={profile.phone||""} onChange={(e)=>onField('phone', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600">Address</label>
                    <input value={profile.address||""} onChange={(e)=>onField('address', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">User Type</label>
                    <select value={profile.user_type||"MEMBER"} onChange={(e)=>onField('user_type', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                      <option>MEMBER</option>
                      <option>LIBRARIAN</option>
                      <option>ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Status</label>
                    <select value={profile.status||"ACTIVE"} onChange={(e)=>onField('status', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                      <option>ACTIVE</option>
                      <option>SUSPENDED</option>
                      <option>INACTIVE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Max Books Allowed</label>
                    <input type="number" min="0" value={profile.max_books_allowed ?? 0} onChange={(e)=>onField('max_books_allowed', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Currently Borrowed</label>
                    <input disabled value={profile.current_books_borrowed ?? 0} className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Total Fines</label>
                    <input disabled value={profile.total_fines ?? 0} className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Recent Loans</h3>
                    <div className="max-h-48 overflow-auto rounded border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-1.5 text-left font-medium text-slate-700">Title</th>
                            <th className="px-3 py-1.5 text-left font-medium text-slate-700">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {loans.map((l) => (
                            <tr key={l.loan_id}>
                              <td className="px-3 py-1.5">{l.title}</td>
                              <td className="px-3 py-1.5">{l.status}</td>
                            </tr>
                          ))}
                          {loans.length === 0 && (
                            <tr><td className="px-3 py-3 text-center text-slate-500" colSpan={2}>No loans</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Reservation History</h3>
                    <div className="max-h-48 overflow-auto rounded border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-1.5 text-left font-medium text-slate-700">Title</th>
                            <th className="px-3 py-1.5 text-left font-medium text-slate-700">To Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {reservations.map((h) => (
                            <tr key={h.history_id}>
                              <td className="px-3 py-1.5">{h.title}</td>
                              <td className="px-3 py-1.5">{h.to_status}</td>
                            </tr>
                          ))}
                          {reservations.length === 0 && (
                            <tr><td className="px-3 py-3 text-center text-slate-500" colSpan={2}>No history</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
