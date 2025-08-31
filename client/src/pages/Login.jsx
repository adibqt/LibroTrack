import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthAPI } from "../lib/api";
import { AuthStore } from "../lib/auth";

const Login = () => {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const navigate = useNavigate();

  // shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authed, setAuthed] = useState(false);

  const isSignIn = mode === "signin";
  // signin fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // signup fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [userType, setUserType] = useState("MEMBER");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (isSignIn) {
        const res = await AuthAPI.login(username, password);
        if (res?.token) {
          AuthStore.setToken(res.token);
          navigate("/", { replace: true });
        } else {
          throw new Error("Invalid response from server");
        }
      } else {
        if (password !== confirm) {
          throw new Error("Passwords do not match");
        }
        await AuthAPI.register({
          username,
          password,
          first_name: firstName,
          last_name: lastName,
          email,
          user_type: userType,
        });
        setNotice("Account created. Signing you in...");
        // Auto-login after successful registration
        const res = await AuthAPI.login(username, password);
        if (res?.token) {
          AuthStore.setToken(res.token);
          navigate("/catalog", { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // If there's a token, verify it with backend; don't auto-redirect, just show banner
  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = AuthStore.getToken();
      if (!token) return;
      try {
        await AuthAPI.me(token);
        if (mounted) setAuthed(true);
      } catch {
        // Invalid/expired token; clear and stay on login page
        AuthStore.clear();
        if (mounted) setAuthed(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    AuthStore.clear();
    setAuthed(false);
  };

  return (
    <section className="min-h-[calc(100vh-64px-64px)] bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        {/* Left card */}
        <div className="order-2 lg:order-1">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900">
                {isSignIn ? "Welcome back" : "Create your account"}
              </h1>
              <div className="flex rounded-lg bg-gray-100 p-1 text-sm">
                <button
                  className={`rounded-md px-3 py-1 font-medium transition-colors ${
                    isSignIn
                      ? "bg-white text-gray-900 shadow"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
                <button
                  className={`rounded-md px-3 py-1 font-medium transition-colors ${
                    !isSignIn
                      ? "bg-white text-gray-900 shadow"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  onClick={() => setMode("signup")}
                >
                  Sign up
                </button>
              </div>
            </div>

            {/* Already authenticated banner */}
            {authed && (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                You're already signed in.
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                  >
                    Go to dashboard
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              {!isSignIn && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-700">
                      First name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Alex"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">
                      Last name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Johnson"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="johndoe"
                />
              </div>
              {!isSignIn && (
                <div>
                  <label className="block text-sm text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you@example.com"
                  />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-gray-700">
                    Password
                  </label>
                  {isSignIn && (
                    <Link
                      to="#"
                      className="text-xs text-blue-700 hover:underline"
                    >
                      Forgot?
                    </Link>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              {!isSignIn && (
                <>
                  <div>
                    <label className="block text-sm text-gray-700">
                      Confirm password
                    </label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">
                      Account type
                    </label>
                    <select
                      value={userType}
                      onChange={(e) => setUserType(e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <label className="inline-flex items-start gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      required
                      className="mt-1 rounded border-gray-300"
                    />
                    I agree to the
                    <Link to="/terms" className="text-blue-700 hover:underline">
                      Terms
                    </Link>
                    and
                    <Link
                      to="/privacy"
                      className="text-blue-700 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </>
              )}

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {notice && !error && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {loading
                  ? isSignIn
                    ? "Signing in..."
                    : "Creating account..."
                  : isSignIn
                  ? "Sign in"
                  : "Create account"}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-gray-600">
              {isSignIn ? (
                <>
                  New to LibroTrack?{" "}
                  <button
                    className="text-blue-700 hover:underline"
                    onClick={() => setMode("signup")}
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    className="text-blue-700 hover:underline"
                    onClick={() => setMode("signin")}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
