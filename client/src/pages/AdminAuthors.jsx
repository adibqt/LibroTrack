import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthorsAPI } from "../lib/api";
import { clearToken } from "../lib/auth";

function TextField({ label, ...props }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">{label}</span>
      <input
        {...props}
        className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          props.className || ""
        }`}
      />
    </label>
  );
}

export default function AdminAuthors() {
  const navigate = useNavigate();
  const [authors, setAuthors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ first_name: "", last_name: "" });
  const [editingId, setEditingId] = useState(null);
  const [books, setBooks] = useState([]);

  const logout = () => {
    clearToken();
    navigate("/", { replace: true });
  };

  const fetchAuthors = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await AuthorsAPI.list();
      setAuthors(list);
    } catch (e) {
      setError(e.message || "Failed to load authors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return authors;
    const q = search.toLowerCase();
    return authors.filter(
      (a) =>
        (a.first_name || "").toLowerCase().includes(q) ||
        (a.last_name || "").toLowerCase().includes(q)
    );
  }, [authors, search]);

  const startCreate = () => {
    setEditingId(null);
    setForm({ first_name: "", last_name: "" });
  };

  const startEdit = (a) => {
    setEditingId(a.author_id);
    setForm({ first_name: a.first_name || "", last_name: a.last_name || "" });
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await AuthorsAPI.update(editingId, form);
      } else {
        await AuthorsAPI.create(form);
      }
      await fetchAuthors();
      startCreate();
    } catch (e) {
      setError(e.message || "Save failed");
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this author? This cannot be undone.")) return;
    try {
      await AuthorsAPI.remove(id);
      await fetchAuthors();
      if (editingId === id) startCreate();
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  };

  const viewBooks = async (authorId) => {
    setError("");
    try {
      const list = await AuthorsAPI.getBooks(authorId);
      setBooks(list);
    } catch (e) {
      setError(e.message || "Failed to load books for author");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-center">
            <div className="absolute left-0 flex items-center gap-3">
              <Link
                to="/admin"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Back
              </Link>
              <div className="grid h-9 w-9 place-items-center rounded bg-blue-600 font-bold text-white">
                LT
              </div>
              <span className="text-lg font-semibold text-gray-900">
                LibroTrack
              </span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">
              Author Management
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-md border-l-4 border-rose-500 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search authors"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={fetchAuthors}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                Refresh
              </button>
              <button
                onClick={startCreate}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
              >
                New
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">First Name</th>
                    <th className="px-3 py-2 text-left">Last Name</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        No authors found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a) => (
                      <tr key={a.author_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700">
                          {a.author_id}
                        </td>
                        <td className="px-3 py-2">{a.first_name}</td>
                        <td className="px-3 py-2">{a.last_name}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => startEdit(a)}
                            className="mr-2 rounded-md bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(a.author_id)}
                            className="mr-2 rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => viewBooks(a.author_id)}
                            className="rounded-md bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-700"
                          >
                            Books
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Books for selected author */}
            {books.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Books for author
                </h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                  {books.map((b) => (
                    <li key={b.book_id}>
                      {b.title}{" "}
                      <span className="text-slate-500">(#{b.book_id})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Author" : "New Author"}
            </h2>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              {editingId && (
                <TextField
                  label="Author ID"
                  name="author_id"
                  value={editingId}
                  readOnly
                  className="bg-slate-50"
                />
              )}
              <TextField
                label="First Name"
                name="first_name"
                value={form.first_name}
                onChange={onChange}
                required
              />
              <TextField
                label="Last Name"
                name="last_name"
                value={form.last_name}
                onChange={onChange}
                required
              />
              <div className="pt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  {editingId ? "Save Changes" : "Create Author"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
