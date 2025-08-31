import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth";
import { API_BASE } from "../lib/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

export default function AdminReports() {
  const navigate = useNavigate();
  const logout = () => { clearToken(); navigate("/admin/login"); };
  const goBack = () => navigate("/admin");

  const [tab, setTab] = useState("overview");
  const [popular, setPopular] = useState([]);
  const [activity, setActivity] = useState([]);
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [p, a, f] = await Promise.all([
        fetchJson('/api/reports/popular-books'),
        fetchJson('/api/reports/member-activity'),
        fetchJson('/api/reports/fines'),
      ]);
      setPopular(p);
      setActivity(a);
      setFines(f);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

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
            <h1 className="text-lg font-semibold text-slate-900">Reports & Analytics</h1>
            <div className="absolute right-0">
              <button onClick={logout} className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

        <div className="mb-4 flex gap-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'books', label: 'Book Popularity' },
            { id: 'members', label: 'Member Activity' },
            { id: 'fines', label: 'Fines Summary' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-md border px-3 py-1.5 text-sm ${tab===t.id? 'border-blue-600 bg-blue-50 text-blue-700':'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{t.label}</button>
          ))}
          <button onClick={load} className="ml-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">Refresh</button>
        </div>

        {(tab === 'overview') && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">Top Books</div>
              {/* Mini chart: top 5 books by loan_count */}
              <div className="mt-3 h-40 w-full">
                {(() => {
                  const top5 = [...popular]
                    .sort((a,b)=> (Number(b.loan_count)||0)-(Number(a.loan_count)||0))
                    .slice(0,5);
                  if (top5.length === 0) return <div className="text-sm text-slate-500">No data</div>;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={top5} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <YAxis dataKey="title" type="category" width={140} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                        <XAxis type="number" hide allowDecimals={false} />
                        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                        <Bar dataKey="loan_count" name="Loans" fill="#0ea5e9" radius={[3,3,3,3]} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
              <div className="mt-3 space-y-1">
                {popular.slice(0,5).map((b)=> (
                  <div key={b.book_id} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{b.title}</span>
                    <span className="font-medium text-slate-900">{b.loan_count}</span>
                  </div>
                ))}
                {popular.length===0 && <div className="text-sm text-slate-500">No data</div>}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">Most Active Members</div>
              {/* Mini stacked chart: top 5 members by (loan_count + reservation_count) */}
              <div className="mt-3 h-40 w-full">
                {(() => {
                  const top5 = [...activity]
                    .sort((a,b)=> ((Number(b.loan_count)||0)+(Number(b.reservation_count)||0)) - ((Number(a.loan_count)||0)+(Number(a.reservation_count)||0)))
                    .slice(0,5);
                  if (top5.length === 0) return <div className="text-sm text-slate-500">No data</div>;
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={top5} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <YAxis
                          dataKey="user_id"
                          type="category"
                          width={140}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(_, idx) => {
                            const d = top5[idx];
                            return d ? `${d.first_name} ${d.last_name}` : '';
                          }}
                        />
                        <XAxis type="number" hide allowDecimals={false} />
                        <Tooltip
                          cursor={{ fill: "rgba(0,0,0,0.04)" }}
                          formatter={(value, name) => [value, name === 'loan_count' ? 'Loans' : name === 'reservation_count' ? 'Reservations' : name]}
                          labelFormatter={(_, idx) => {
                            const d = top5[idx];
                            return d ? `${d.first_name} ${d.last_name}` : '';
                          }}
                        />
                        <Bar dataKey="loan_count" name="Loans" stackId="a" fill="#10b981" radius={[3,3,3,3]} />
                        <Bar dataKey="reservation_count" name="Reservations" stackId="a" fill="#60a5fa" radius={[3,3,3,3]} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
              <div className="mt-3 space-y-1">
                {activity.sort((a,b)=> (b.loan_count+b.reservation_count) - (a.loan_count+a.reservation_count)).slice(0,5).map((m)=> (
                  <div key={m.user_id} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{m.first_name} {m.last_name}</span>
                    <span className="font-medium text-slate-900">{m.loan_count + m.reservation_count}</span>
                  </div>
                ))}
                {activity.length===0 && <div className="text-sm text-slate-500">No data</div>}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">Fines</div>
              <div className="mt-2">
                {fines[0] ? (
                  <>
                    {/* Mini pie for fines distribution by count */}
                    <div className="h-40 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip />
                          <Pie
                            data={[
                              { name: 'Unpaid', value: Number(fines[0].unpaid_fines)||0 },
                              { name: 'Paid', value: Number(fines[0].paid_fines)||0 },
                              { name: 'Waived', value: Number(fines[0].waived_fines)||0 },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={2}
                          >
                            {['#ef4444','#10b981','#94a3b8'].map((c, idx)=> (
                              <Cell key={`cell-${idx}`} fill={c} />
                            ))}
                          </Pie>
                          <Legend verticalAlign="bottom" height={24} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="text-slate-600">Total fines</div><div className="text-right font-medium">{fines[0].total_fines}</div>
                      <div className="text-slate-600">Unpaid</div><div className="text-right font-medium">{fines[0].unpaid_fines} ({fines[0].unpaid_amount})</div>
                      <div className="text-slate-600">Paid</div><div className="text-right font-medium">{fines[0].paid_fines} ({fines[0].paid_amount})</div>
                      <div className="text-slate-600">Waived</div><div className="text-right font-medium">{fines[0].waived_fines} ({fines[0].waived_amount})</div>
                    </div>
                  </>
                ) : <div className="text-sm text-slate-500">No data</div>}
              </div>
            </div>
          </div>
        )}

        {(tab === 'books') && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Book Popularity</h2>
            {/* Chart: vertical bar chart using existing data keys: title, loan_count */}
            <div className="mb-4 h-72 w-full">
              {(() => {
                const top = [...popular]
                  .sort((a,b)=> (Number(b.loan_count)||0)-(Number(a.loan_count)||0))
                  .slice(0, 10);
                if (top.length === 0) return <div className="text-sm text-slate-500">No data</div>;
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      {/* Use existing key 'title' for category labels */}
                      <YAxis dataKey="title" type="category" width={180} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                      <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                      <Bar dataKey="loan_count" name="Loans" fill="#0ea5e9" radius={[4,4,4,4]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
            <div className="max-h-[60vh] overflow-auto rounded border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Book ID</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Title</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Loans</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {popular.map((b) => (
                    <tr key={b.book_id}>
                      <td className="px-3 py-2">{b.book_id}</td>
                      <td className="px-3 py-2">{b.title}</td>
                      <td className="px-3 py-2">{b.loan_count}</td>
                    </tr>
                  ))}
                  {popular.length===0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={3}>{loading ? 'Loading…' : 'No data'}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(tab === 'members') && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Member Activity</h2>
            {/* Chart: stacked vertical bars using existing keys: loan_count + reservation_count */}
            <div className="mb-4 h-72 w-full">
              {(() => {
                const top = [...activity]
                  .sort((a,b)=> ((Number(b.loan_count)||0)+(Number(b.reservation_count)||0)) - ((Number(a.loan_count)||0)+(Number(a.reservation_count)||0)))
                  .slice(0, 10);
                if (top.length === 0) return <div className="text-sm text-slate-500">No data</div>;
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      {/* Use user_id as the key and format ticks to show full name without changing data shape */}
                      <YAxis
                        dataKey="user_id"
                        type="category"
                        width={180}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(_, idx) => {
                          const d = top[idx];
                          return d ? `${d.first_name} ${d.last_name}` : '';
                        }}
                      />
                      <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(0,0,0,0.04)" }}
                        formatter={(value, name) => [value, name === 'loan_count' ? 'Loans' : name === 'reservation_count' ? 'Reservations' : name]}
                        labelFormatter={(_, idx) => {
                          const d = top[idx];
                          return d ? `${d.first_name} ${d.last_name}` : '';
                        }}
                      />
                      <Legend />
                      <Bar dataKey="loan_count" name="Loans" stackId="a" fill="#10b981" radius={[4,4,4,4]} />
                      <Bar dataKey="reservation_count" name="Reservations" stackId="a" fill="#60a5fa" radius={[4,4,4,4]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
            <div className="max-h-[60vh] overflow-auto rounded border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">User ID</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Member</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Loans</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Reservations</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Fines</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activity.map((m) => (
                    <tr key={m.user_id}>
                      <td className="px-3 py-2">{m.user_id}</td>
                      <td className="px-3 py-2">{m.first_name} {m.last_name}</td>
                      <td className="px-3 py-2">{m.loan_count}</td>
                      <td className="px-3 py-2">{m.reservation_count}</td>
                      <td className="px-3 py-2">{m.fine_count}</td>
                    </tr>
                  ))}
                  {activity.length===0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={5}>{loading ? 'Loading…' : 'No data'}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(tab === 'fines') && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Fines Summary</h2>
            {fines[0] ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[{label:'Total fines',value:fines[0].total_fines},
                  {label:'Unpaid count',value:fines[0].unpaid_fines},
                  {label:'Unpaid amount',value:fines[0].unpaid_amount},
                  {label:'Paid count',value:fines[0].paid_fines},
                  {label:'Paid amount',value:fines[0].paid_amount},
                  {label:'Waived count',value:fines[0].waived_fines},
                  {label:'Waived amount',value:fines[0].waived_amount},
                  {label:'Total amount',value:fines[0].total_amount},
                ].map((c, idx)=> (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-500">{c.label}</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{c.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No data</div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
