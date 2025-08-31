import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded bg-blue-600 text-white grid place-items-center font-bold">
                LT
              </div>
              <span className="text-lg font-semibold text-gray-900">
                LibroTrack
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              A modern library management system for efficient cataloging,
              lending, and insights.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  className="text-gray-600 hover:text-blue-700"
                  to="/catalog"
                >
                  Catalog
                </Link>
              </li>
              <li>
                <Link
                  className="text-gray-600 hover:text-blue-700"
                  to="/members"
                >
                  Members
                </Link>
              </li>
              <li>
                <Link className="text-gray-600 hover:text-blue-700" to="/about">
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Resources</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>Help Center</li>
              <li>API Docs</li>
              <li>Contact</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Stay updated
            </h3>
            <form className="mt-3 flex gap-2">
              <input
                type="email"
                placeholder="Email address"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-6">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} LibroTrack. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
