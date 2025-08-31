const TOKEN_KEY = "librotrack_token";
const ADMIN_KEY = "librotrack_admin";

// Notify same-tab listeners when auth token changes
const emitAuthChanged = (token) => {
  try {
    const ev = new CustomEvent("auth:changed", {
      detail: { token: token || null },
    });
    window.dispatchEvent(ev);
  } catch {}
};

export const AuthStore = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t) => {
    localStorage.setItem(TOKEN_KEY, t);
    emitAuthChanged(t);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    emitAuthChanged(null);
  },
  isAuthenticated: () => Boolean(localStorage.getItem(TOKEN_KEY)),
};

export const authHeader = () => {
  const token = AuthStore.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Convenience named exports used across pages
export const isAuthed = () => AuthStore.isAuthenticated();
export const setToken = (t) => AuthStore.setToken(t);
export const clearToken = () => {
  // Clear both user token and admin session for safety
  AuthStore.clear();
  try {
    localStorage.removeItem(ADMIN_KEY);
  } catch {}
};

// Admin session helpers
export const setAdmin = (flag = true) => {
  try {
    localStorage.setItem(ADMIN_KEY, flag ? "1" : "");
  } catch {}
};
export const clearAdmin = () => {
  try {
    localStorage.removeItem(ADMIN_KEY);
  } catch {}
};
export const isAdmin = () => {
  try {
    return Boolean(localStorage.getItem(ADMIN_KEY));
  } catch {
    return false;
  }
};
