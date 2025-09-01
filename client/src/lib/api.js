// Simple API client for LibroTrack frontend
// Normalize base: if VITE_API_URL is an origin (http://localhost:3000), append /api
function normalizeBase(base) {
  if (!base) return "/api";
  const trimmed = base.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}
const API_BASE = normalizeBase(import.meta.env.VITE_API_URL);

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    // Spread options first, then enforce defaults/merged values to avoid overrides
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: options.credentials || "same-origin",
  });
  // If running on Vite dev (5173) with proxy misconfig, retry directly to backend
  if (res.status === 404 && API_BASE === "/api") {
    try {
      const isDev5173 =
        typeof window !== "undefined" && window.location.port === "5173";
      if (isDev5173) {
        const direct = `http://localhost:3000${url}`; // url already starts with /api
        const res2 = await fetch(direct, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
          },
          credentials: options.credentials || "same-origin",
        });
        if (res2.ok) {
          const ct2 = res2.headers.get("content-type") || "";
          return ct2.includes("application/json")
            ? await res2.json()
            : await res2.text();
        }
        // fall through to normal handling with the original response if retry also failed
      }
    } catch {}
  }
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.text();
  if (!res.ok) {
    const message =
      typeof data === "string" ? data : data?.error || "Request failed";
    throw new Error(message);
  }
  return data;
}

export const AuthAPI = {
  login: (username, password) =>
    request(`/auth/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: ({
    username,
    password,
    first_name,
    last_name,
    email,
    user_type = "MEMBER",
  }) =>
    request(`/auth/register`, {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        first_name,
        last_name,
        email,
        user_type,
      }),
    }),
  me: (token) =>
    request(`/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// Backward-compat named export expected by AdminLogin.jsx
export const login = ({ username, password }) =>
  AuthAPI.login(username, password);

// Catalog API helpers
export const CatalogAPI = {
  // GET /api/catalog/books?title=&author=&category=
  searchBooks: ({ title = "", author = "", category = "" } = {}) => {
    const q = new URLSearchParams({
      ...(title ? { title } : {}),
      ...(author ? { author } : {}),
      ...(category ? { category } : {}),
    }).toString();
    const qp = q ? `?${q}` : "";
    return request(`/catalog/books${qp}`);
  },
  // Alias used by AdminBookManager
  listBooks: (params = {}) => {
    const { title = "", author = "", category = "" } = params || {};
    const q = new URLSearchParams({
      ...(title ? { title } : {}),
      ...(author ? { author } : {}),
      ...(category ? { category } : {}),
    }).toString();
    const qp = q ? `?${q}` : "";
    return request(`/catalog/books${qp}`);
  },
  getBook: (bookId) => request(`/catalog/books/${bookId}`),
  getAvailability: (bookId) => request(`/catalog/books/${bookId}/availability`),
  getAuthors: (bookId) => request(`/catalog/books/${bookId}/authors`),
  getLowStock: () => request(`/catalog/stock/low`),
  // Admin endpoints (require Authorization header)
  createBook: (book, token) =>
    request(`/catalog/books`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify(book),
    }),
  updateBook: (bookId, book, token) =>
    request(`/catalog/books/${bookId}`, {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify(book),
    }),
  addAuthorToBook: (bookId, authorId, token) =>
    request(`/catalog/books/${bookId}/authors/${authorId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
  removeAuthorFromBook: (bookId, authorId, token) =>
    request(`/catalog/books/${bookId}/authors/${authorId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
  // Delete a book (admin)
  deleteBook: (bookId, token) =>
    request(`/catalog/books/${bookId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
};

// Loans API helpers
export const LoansAPI = {
  issue: ({ user_id, book_id, due_days }, token) =>
    request(`/loans`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify({ user_id, book_id, due_days }),
    }),
  returnLoan: (loan_id, token) =>
    request(`/loans/${loan_id}/return`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
  listForUser: (user_id, { status } = {}, token) =>
    request(
      `/loans/user/${user_id}${
        status ? `?status=${encodeURIComponent(status)}` : ""
      }`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    ),
};

// Fines API helpers
export const FinesAPI = {
  // Admin list with optional filters like user_id, status
  list: (params = {}, token) => {
    const qs = new URLSearchParams();
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        const val = v == null ? "" : String(v);
        if (val.trim() !== "") qs.set(k, val);
      }
    }
    const q = qs.toString();
    return request(`/fines${q ? `?${q}` : ""}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  },
  create: ({ user_id, amount, fine_type, description }, token) =>
    request(`/fines`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify({ user_id, amount, fine_type, description }),
    }),
  listForUser: (user_id, token) =>
    request(`/fines/user/${user_id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
  getById: (fine_id, token) =>
    request(`/fines/${fine_id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
  pay: (fine_id, token) =>
    request(`/fines/${fine_id}/pay`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
};

// Categories API (admin helpers)
export const CategoriesAPI = {
  list: () => request(`/categories`),
  create: ({ category_name, description }, token) =>
    request(`/categories`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify({ category_name, description }),
    }),
};

// Members API (admin helpers)
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
    return request(`/members${q ? `?${q}` : ""}`);
  },
  get: (userId) => request(`/members/${userId}`),
  update: (userId, payload, token) =>
    request(`/members/${userId}`, {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify(payload),
    }),
  remove: (userId, token) =>
    request(`/members/${userId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
    return request(
      `/members/${userId}/history/reservations${q ? `?${q}` : ""}`
    );
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
    return request(`/members/${userId}/history/loans${q ? `?${q}` : ""}`);
  },
};

// Reservations API (admin helpers)
export const ReservationsAPI = {
  list: (params = {}, token) => {
    const qs = new URLSearchParams();
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        const val = v == null ? "" : String(v);
        if (val.trim() !== "") qs.set(k, val);
      }
    }
    const q = qs.toString();
    return request(`/reservations${q ? `?${q}` : ""}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  },
  create: ({ user_id, book_id, expiry_days, priority_level }, token) =>
    request(`/reservations`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify({ user_id, book_id, expiry_days, priority_level }),
    }),
  cancel: (reservationId, token) =>
    request(`/reservations/${reservationId}/cancel`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
  fulfill: (reservationId, token) =>
    request(`/reservations/${reservationId}/fulfill`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
  expireDue: (token) =>
    request(`/reservations/expire/run`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
};

// Authors API (admin helpers)
export const AuthorsAPI = {
  list: () => request(`/authors`),
  create: ({ first_name, last_name }, token) =>
    request(`/authors`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify({ first_name, last_name }),
    }),
  get: (id) => request(`/authors/${id}`),
  update: (id, { first_name, last_name }, token) =>
    request(`/authors/${id}`, {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify({ first_name, last_name }),
    }),
  remove: (id, token) =>
    request(`/authors/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
  // GET /api/authors/:authorId/books
  getBooks: (authorId) => request(`/authors/${authorId}/books`),
};

export default {
  request,
  AuthAPI,
  CatalogAPI,
  LoansAPI,
  FinesAPI,
  CategoriesAPI,
  MembersAPI,
  ReservationsAPI,
  AuthorsAPI,
};
