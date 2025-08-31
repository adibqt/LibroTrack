import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CatalogAPI, CategoriesAPI } from "../lib/api";
import { clearToken, AuthStore } from "../lib/auth";

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

function SelectField({ label, children, ...props }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">{label}</span>
      <select
        {...props}
        className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          props.className || ""
        }`}
      >
        {children}
      </select>
    </label>
  );
}

const emptyBook = {
  isbn: "",
  title: "",
  category_id: "",
  publication_year: "",
  publisher: "",
  language: "English",
  description: "",
  location_shelf: "",
  total_copies: 1,
  status: "AVAILABLE",
};

export default function AdminBookManager() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyBook);
  const [editingId, setEditingId] = useState(null);

  const logout = () => {
    clearToken();
    navigate("/", { replace: true });
  };

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [cats, list] = await Promise.all([
        CategoriesAPI.list(),
        search && search.trim() !== ""
          ? CatalogAPI.listBooks({ title: search.trim() })
          : CatalogAPI.listBooks(),
      ]);
      setCategories(cats);
      setBooks(list);
    } catch (e) {
      setError(e.message || "Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When search is cleared, reload the full list from the server
  useEffect(() => {
    if (search.trim() === "") {
      fetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyBook);
  };

  const startEdit = (b) => {
    setEditingId(b.book_id);
    setForm({
      isbn: b.isbn || "",
      title: b.title || "",
      category_id: b.category_id || "",
      publication_year: b.publication_year || "",
      publisher: b.publisher || "",
      language: b.language || "English",
      description: b.description || "",
      location_shelf: b.location_shelf || "",
      total_copies: b.total_copies ?? 1,
      status: b.status || "AVAILABLE",
    });
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "total_copies" ? Number(value) : value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await CatalogAPI.updateBook(editingId, {
          ...form,
          category_id: Number(form.category_id),
          publication_year: form.publication_year
            ? Number(form.publication_year)
            : null,
        });
      } else {
        await CatalogAPI.createBook({
          ...form,
          category_id: Number(form.category_id),
          publication_year: form.publication_year
            ? Number(form.publication_year)
            : null,
        });
      }
      await fetchAll();
      startCreate();
    } catch (e) {
      setError(e.message || "Save failed");
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this book? This cannot be undone.")) return;
    try {
  const token = AuthStore.getToken();
  await CatalogAPI.deleteBook(id, token);
      await fetchAll();
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  };

  const filtered = useMemo(() => {
    if (!search) return books;
    const q = search.toLowerCase();
    return books.filter(
      (b) =>
        (b.title || "").toLowerCase().includes(q) ||
        (b.isbn || "").toLowerCase().includes(q)
    );
  }, [books, search]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-center">
            {/* Left: Brand + Back */}
            <div className="absolute left-0 flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded bg-blue-600 font-bold text-white">
                  LT
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  LibroTrack
                </span>
              </Link>
              <button
                onClick={() => navigate("/admin")}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
            </div>
            {/* Center title */}
            <h1 className="text-lg font-semibold text-slate-900">
              Book Management
            </h1>
            {/* Right: Logout */}
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
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Books</h2>
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title or ISBN"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={fetchAll}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm hover:bg-slate-200"
                >
                  Refresh
                </button>
                <button
                  onClick={startCreate}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                >
                  New
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">ISBN</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Year</th>
                    <th className="px-3 py-2">Copies</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        No books found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((b) => (
                      <tr key={b.book_id} className="border-t">
                        <td className="px-3 py-2 text-slate-700">
                          {b.book_id}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800">
                          {b.title}
                        </td>
                        <td className="px-3 py-2">{b.isbn}</td>
                        <td className="px-3 py-2">
                          {categories.find(
                            (c) => c.category_id === b.category_id
                          )?.category_name || b.category_id}
                        </td>
                        <td className="px-3 py-2">
                          {b.publication_year || ""}
                        </td>
                        <td className="px-3 py-2">
                          {b.available_copies}/{b.total_copies}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                              b.status === "AVAILABLE"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => startEdit(b)}
                            className="mr-2 rounded-md bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(b.book_id)}
                            className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {error && (
              <div className="mt-3 rounded-md border-l-4 border-rose-500 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            )}
          </div>

          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Book" : "New Book"}
            </h2>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              {editingId && (
                <TextField
                  label="Book ID"
                  name="book_id"
                  value={editingId}
                  readOnly
                  className="bg-slate-50"
                />
              )}
              <TextField
                label="Title"
                name="title"
                value={form.title}
                onChange={onChange}
                required
              />
              <TextField
                label="ISBN"
                name="isbn"
                value={form.isbn}
                onChange={onChange}
                required
              />
              <SelectField
                label="Category"
                name="category_id"
                value={form.category_id}
                onChange={onChange}
                required
              >
                <option value="" disabled>
                  Choose a category
                </option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </SelectField>
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer select-none">
                  Add new category
                </summary>
                <AddCategory
                  onAdded={async () => {
                    await fetchAll();
                  }}
                />
              </details>
              <TextField
                label="Publication Year"
                name="publication_year"
                value={form.publication_year}
                onChange={onChange}
                inputMode="numeric"
                pattern="^[0-9]{4}$"
                maxLength={4}
                placeholder="e.g., 2024"
                title="Enter a 4-digit year like 2024"
              />
              <TextField
                label="Publisher"
                name="publisher"
                value={form.publisher}
                onChange={onChange}
              />
              <TextField
                label="Language"
                name="language"
                value={form.language}
                onChange={onChange}
              />
              <label className="block text-sm">
                <span className="text-slate-700">Description</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <TextField
                label="Shelf Location"
                name="location_shelf"
                value={form.location_shelf}
                onChange={onChange}
              />
              <TextField
                label="Total Copies"
                name="total_copies"
                value={form.total_copies}
                onChange={onChange}
                inputMode="numeric"
              />
              {editingId && (
                <SelectField
                  label="Status"
                  name="status"
                  value={form.status}
                  onChange={onChange}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="NOT_AVAILABLE">NOT_AVAILABLE</option>
                </SelectField>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  {editingId ? "Save Changes" : "Create Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function AddCategory({ onAdded }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (!name.trim()) throw new Error("Name required");
      await CategoriesAPI.create({
        category_name: name.trim(),
        description: desc,
      });
      setName("");
      setDesc("");
      onAdded && onAdded();
    } catch (e) {
      setErr(e.message || "Failed to add category");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          className="flex-1 rounded-md border border-slate-300 px-2 py-1"
        />
        <button
          disabled={busy}
          className="rounded-md bg-slate-800 px-3 py-1 text-xs text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description (optional)"
        className="rounded-md border border-slate-300 px-2 py-1"
      />
      {err && <div className="text-xs text-rose-600">{err}</div>}
    </form>
  );
}
