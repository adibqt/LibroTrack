import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { AuthStore } from "../lib/auth";
import { AuthAPI } from "../lib/api";

const Header = () => {
  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "text-white bg-blue-600"
        : "text-gray-700 hover:text-blue-700 hover:bg-blue-50"
    }`;

  const [me, setMe] = useState(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = AuthStore.getToken();
        if (!token) return;
        const data = await AuthAPI.me(token);
        if (!cancelled) setMe(data);
      } catch {}
    }
    load();
    // react to storage changes from other tabs
    const onStorage = (e) => {
      if (e.key === "librotrack_token") {
        setMe(null);
        load();
      }
    };
    const onAuthChanged = () => {
      setMe(null);
      load();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:changed", onAuthChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:changed", onAuthChanged);
    };
  }, []);

  const signOut = () => {
    AuthStore.clear();
    setMe(null);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded bg-blue-600 text-white grid place-items-center font-bold">
              LT
            </div>
            <span className="text-lg font-semibold text-gray-900">
              LibroTrack
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {!me ? (
              <>
                <NavLink to="/" end className={navLinkClass}>
                  Home
                </NavLink>
                <NavLink to="/about" className={navLinkClass}>
                  About
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" end className={navLinkClass}>
                  Home
                </NavLink>
                <NavLink to="/catalog" className={navLinkClass}>
                  Catalog
                </NavLink>
                <NavLink to="/my-loans" className={navLinkClass}>
                  My Borrowed Books
                </NavLink>
                <NavLink to="/history" className={navLinkClass}>
                  History
                </NavLink>
                <NavLink to="/fines" className={navLinkClass}>
                  Fines
                </NavLink>
                <NavLink to="/members" className={navLinkClass}>
                  Members
                </NavLink>
                <NavLink to="/about" className={navLinkClass}>
                  About
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {!me ? (
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                Sign in
              </Link>
            ) : (
              <>
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  title="Profile"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-white font-bold">
                    {me.first_name?.[0]?.toUpperCase() ||
                      me.username?.[0]?.toUpperCase() ||
                      "U"}
                  </div>
                  <span className="hidden sm:inline">{me.username}</span>
                </Link>
                <button
                  onClick={signOut}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </>
            )}
            {me && (
              <>
                <Link
                  to="/my-loans"
                  className="sm:hidden inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  My Loans
                </Link>
                <Link
                  to="/history"
                  className="sm:hidden inline-flex items-center justify-center rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  History
                </Link>
                <Link
                  to="/fines"
                  className="sm:hidden inline-flex items-center justify-center rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  Fines
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
