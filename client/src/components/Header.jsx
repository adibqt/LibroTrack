import React from "react";
import { Link, NavLink } from "react-router-dom";

const Header = () => {
  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "text-white bg-blue-600"
        : "text-gray-700 hover:text-blue-700 hover:bg-blue-50"
    }`;

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
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/catalog" className={navLinkClass}>
              Catalog
            </NavLink>
            <NavLink to="/members" className={navLinkClass}>
              Members
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              About
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              Sign in
            </Link>
            <Link
              to="/catalog"
              className="hidden sm:inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Browse Books
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
