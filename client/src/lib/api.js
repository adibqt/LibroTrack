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

export default { request, AuthAPI, CatalogAPI, LoansAPI, FinesAPI };
