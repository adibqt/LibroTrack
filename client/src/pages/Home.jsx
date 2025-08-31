import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthStore } from "../lib/auth";
import api, { CatalogAPI } from "../lib/api";

const Home = () => {
  const [counts, setCounts] = useState({ books: null, authors: null });

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const [books, authors] = await Promise.all([
          // List all books (search with no filters)
          CatalogAPI.searchBooks({}).catch(() => []),
          // List all authors
          api.request("/authors").catch(() => []),
        ]);
        if (!aborted) {
          setCounts({
            books: Array.isArray(books) ? books.length : 0,
            authors: Array.isArray(authors) ? authors.length : 0,
          });
        }
      } catch {
        if (!aborted) setCounts({ books: 0, authors: 0 });
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              Modern Library Management
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Organize, Lend, and Discover with ease.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              LibroTrack helps librarians and members manage catalog, loans,
              reservations, and fines in one seamless experience.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                to="/catalog"
                className="rounded-md bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                Explore Catalog
              </Link>
              <Link
                to="/about"
                className="rounded-md border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Learn more
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-10 -right-10 h-72 w-72 rounded-full bg-blue-100 blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 h-72 w-72 rounded-full bg-indigo-100 blur-3xl"></div>
            <div className="relative rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur">
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Books",
                    value:
                      counts.books === null
                        ? "—"
                        : counts.books.toLocaleString(),
                  },
                  {
                    label: "Authors",
                    value:
                      counts.authors === null
                        ? "—"
                        : counts.authors.toLocaleString(),
                  },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Why LibroTrack?</h2>
          <p className="mt-2 text-gray-600">
            Everything you need to run a modern library.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Smart Catalog",
              desc: "Organize books by author, category, and availability.",
            },
            {
              title: "Seamless Loans",
              desc: "Track checkouts, due dates, and returns effortlessly.",
            },
            {
              title: "Reservations",
              desc: "Queue and notify members when items are available.",
            },
            {
              title: "Insights",
              desc: "Get reports on usage, fines, and collection health.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-base font-semibold text-gray-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <h3 className="text-2xl font-semibold">Ready to explore?</h3>
              <p className="text-blue-100">
                Browse the catalog or sign in to manage loans.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/catalog"
                className="rounded-md bg-white px-5 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                View Catalog
              </Link>
              <Link
                to="/login"
                className="rounded-md border border-white/70 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
