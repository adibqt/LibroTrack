// Simple API helper
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

export async function login({ username, password }) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export { API_BASE };

// Catalog API (Books)
export const CatalogAPI = {
  listBooks: (params) => {
    const qs = new URLSearchParams();
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        const val = v == null ? "" : String(v);
        if (val.trim() !== "") qs.set(k, val);
      }
    }
    const q = qs.toString();
    return apiFetch(`/api/catalog/books${q ? `?${q}` : ""}`);
  },
  getBook: (bookId) => apiFetch(`/api/catalog/books/${bookId}`),
  createBook: (payload) =>
    apiFetch(`/api/catalog/books`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateBook: (bookId, payload) =>
    apiFetch(`/api/catalog/books/${bookId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteBook: (bookId) =>
    apiFetch(`/api/catalog/books/${bookId}`, {
      method: "DELETE",
    }),
};

// Categories API (for select options)
export const CategoriesAPI = {
  list: () => apiFetch(`/api/categories`),
  create: ({ category_name, description }) =>
    apiFetch(`/api/categories`, {
      method: "POST",
      body: JSON.stringify({ category_name, description }),
    }),
};