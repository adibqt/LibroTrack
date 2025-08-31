const TOKEN_KEY = "librotrack_token";

export const AuthStore = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  isAuthenticated: () => Boolean(localStorage.getItem(TOKEN_KEY)),
};

export const authHeader = () => {
  const token = AuthStore.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
