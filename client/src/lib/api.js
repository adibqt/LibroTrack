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

// Members API
export const MembersAPI = {
  list: (params) => {
    const qs = new URLSearchParams();
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        const val = v == null ? "" : String(v);
        if (val.trim() !== "") qs.set(k, val);
      }
    }
    const q = qs.toString();
    return apiFetch(`/api/members${q ? `?${q}` : ""}`);
  },
  get: (userId) => apiFetch(`/api/members/${userId}`),
  update: (userId, payload) =>
    apiFetch(`/api/members/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (userId) =>
    apiFetch(`/api/members/${userId}`, {
      method: "DELETE",
    }),
  reservationHistory: (userId, params) => {
    const qs = new URLSearchParams();
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        const val = v == null ? "" : String(v);
        if (val.trim() !== "") qs.set(k, val);
      }
    }
    const q = qs.toString();
    return apiFetch(`/api/members/${userId}/history/reservations${q ? `?${q}` : ""}`);
  },
  loansHistory: (userId, params) => {
    const qs = new URLSearchParams();
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        const val = v == null ? "" : String(v);
        if (val.trim() !== "") qs.set(k, val);
      }
    }
    const q = qs.toString();
    return apiFetch(`/api/members/${userId}/history/loans${q ? `?${q}` : ""}`);
  },
};

// Reservations API
export const ReservationsAPI = {
  create: ({ user_id, book_id, expiry_days, priority_level }) =>
    apiFetch(`/api/reservations`, {
      method: "POST",
      body: JSON.stringify({ user_id, book_id, expiry_days, priority_level }),
    }),
  cancel: (reservationId) =>
    apiFetch(`/api/reservations/${reservationId}/cancel`, { method: "POST" }),
  fulfill: (reservationId) =>
    apiFetch(`/api/reservations/${reservationId}/fulfill`, { method: "POST" }),
  expireDue: () => apiFetch(`/api/reservations/expire/run`, { method: "POST" }),
};

// Loans API
export const LoansAPI = {
  issue: ({ user_id, book_id, due_days }) =>
    apiFetch(`/api/loans`, {
      method: "POST",
      body: JSON.stringify({ user_id, book_id, due_days }),
    }),
  returnLoan: (loanId) =>
    apiFetch(`/api/loans/${loanId}/return`, { method: "POST" }),
};

// Fines API
export const FinesAPI = {
  list: (params) => {
    const qs = new URLSearchParams();
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        const val = v == null ? "" : String(v);
        if (val.trim() !== "") qs.set(k, val);
      }
    }
    const q = qs.toString();
    return apiFetch(`/api/fines${q ? `?${q}` : ""}`);
  },
  create: ({ user_id, amount, fine_type }) =>
    apiFetch(`/api/fines`, { method: "POST", body: JSON.stringify({ user_id, amount, fine_type }) }),
  settle: (fineId) => apiFetch(`/api/fines/${fineId}/pay`, { method: "PATCH" }),
  waive: (fineId) => apiFetch(`/api/fines/${fineId}/waive`, { method: "PATCH" }),
};