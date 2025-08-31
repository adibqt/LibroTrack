import React, { useEffect, useMemo, useState } from "react";
import { CatalogAPI, LoansAPI, AuthAPI } from "../lib/api";
import { AuthStore } from "../lib/auth";

function classNames(...c) {
  return c.filter(Boolean).join(" ");
}

const PAGE_SIZE = 8;

const Catalog = () => {
  const [filters, setFilters] = useState({
    title: "",
    author: "",
    category: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [books, setBooks] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [selected, setSelected] = useState(null); // selected book details
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [selectedAvailability, setSelectedAvailability] = useState(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  // Load initial lists
  const [myLoans, setMyLoans] = useState([]);
  const [me, setMe] = useState(null);
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      setError("");
      try {
        const token = AuthStore.getToken();
        const mePromise = token
          ? AuthAPI.me(token).catch(() => null)
          : Promise.resolve(null);
        const [list, low, meRes] = await Promise.all([
          CatalogAPI.searchBooks({}),
          CatalogAPI.getLowStock().catch(() => []),
          mePromise,
        ]);
        if (cancelled) return;
        setBooks(list || []);
        setLowStock(Array.isArray(low) ? low : []);
        setMe(meRes);
        if (meRes && token) {
          const loans = await LoansAPI.listForUser(
            meRes.user_id,
            { status: "ISSUED" },
            token
          ).catch(() => []);
          if (!cancelled) setMyLoans(Array.isArray(loans) ? loans : []);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load catalog");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return books.slice(start, start + PAGE_SIZE);
  }, [books, page]);
  const totalPages = Math.max(1, Math.ceil(books.length / PAGE_SIZE));

  const onSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPage(1);
    try {
      const list = await CatalogAPI.searchBooks(filters);
      setBooks(list || []);
    } catch (e2) {
      setError(e2.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (bookId) => {
    setSelected(null);
    setSelectedAuthors([]);
    setSelectedAvailability(null);
    try {
      const [details, authors, availability] = await Promise.all([
        CatalogAPI.getBook(bookId),
        CatalogAPI.getAuthors(bookId).catch(() => []),
        CatalogAPI.getAvailability(bookId).catch(() => null),
      ]);
      setSelected(details);
      setSelectedAuthors(Array.isArray(authors) ? authors : []);
      setSelectedAvailability(availability);
    } catch (e) {
      setError(e.message || "Failed to load details");
    }
  };

  const borrow = async (bookId) => {
    setError("");
    setToast(null);
    const token = AuthStore.getToken();
    if (!token) {
      setToast({ type: "warn", msg: "Please sign in to borrow a book." });
      return;
    }
    let me;
    try {
      me = await AuthAPI.me(token);
    } catch (e) {
      setToast({ type: "error", msg: "Session expired. Sign in again." });
      return;
    }
    try {
      await LoansAPI.issue(
        { user_id: me.user_id, book_id: bookId, due_days: 14 },
        token
      );
      setToast({ type: "success", msg: "Book borrowed successfully." });
      // refresh books list and availability if modal open
      try {
        const list = await CatalogAPI.searchBooks({ ...filters });
        setBooks(list || []);
      } catch {}
      if (selected && selected.book_id === bookId) {
        try {
          const avail = await CatalogAPI.getAvailability(bookId);
          setSelectedAvailability(avail);
        } catch {}
      }
    } catch (e) {
      const msg = e?.message || "Borrow failed";
      setToast({ type: "error", msg });
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-end justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalog</h1>
          <p className="mt-1 text-gray-600">Browse and search for books.</p>
        </div>
      </div>

      {/* Search */}
      <form
        onSubmit={onSearch}
        className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-lg shadow border border-gray-100"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            value={filters.title}
            onChange={(e) =>
              setFilters((f) => ({ ...f, title: e.target.value }))
            }
            placeholder="e.g. The Alchemist"
            className="mt-1 w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Author
          </label>
          <input
            type="text"
            value={filters.author}
            onChange={(e) =>
              setFilters((f) => ({ ...f, author: e.target.value }))
            }
            placeholder="e.g. Paulo Coelho"
            className="mt-1 w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <input
            type="text"
            value={filters.category}
            onChange={(e) =>
              setFilters((f) => ({ ...f, category: e.target.value }))
            }
            placeholder="e.g. Fiction"
            className="mt-1 w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-gray-700 hover:bg-gray-50 border"
            onClick={() => setFilters({ title: "", author: "", category: "" })}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Results */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Results</h2>
            <div className="text-sm text-gray-500">{books.length} items</div>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {paged.map((b) => (
              <article
                key={b.book_id}
                className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-gray-900 line-clamp-2">
                      {b.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      ISBN: {b.isbn || "—"}
                    </p>
                  </div>
                  <span
                    className={classNames(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      (b.available_copies ?? 0) > 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    )}
                  >
                    {(b.available_copies ?? 0) > 0 ? "Available" : "Out"}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">Category</dt>
                    <dd className="text-gray-800">
                      {b.category_name || b.category_id || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Year</dt>
                    <dd className="text-gray-800">
                      {b.publication_year || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Available</dt>
                    <dd className="text-gray-800">
                      {b.available_copies ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Reserved</dt>
                    <dd className="text-gray-800">
                      {b.reserved_copies ?? "—"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openDetails(b.book_id)}
                    className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => borrow(b.book_id)}
                    disabled={(b.available_copies ?? 0) <= 0}
                    className={classNames(
                      "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm",
                      (b.available_copies ?? 0) > 0
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    )}
                  >
                    Borrow
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Low stock */}
        <aside>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800">Low stock</h3>
            <ul className="mt-2 space-y-2">
              {lowStock.length === 0 && (
                <li className="text-sm text-gray-500">No low stock items.</li>
              )}
              {lowStock.map((ls) => (
                <li key={ls.book_id} className="text-sm">
                  <button
                    className="text-left text-gray-700 hover:text-blue-600"
                    onClick={() => openDetails(ls.book_id)}
                  >
                    {ls.title}
                  </button>
                  <div className="text-xs text-gray-500">
                    Available: {ls.available_copies ?? "—"}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* Details modal */}
      {selected && (
        <div
          className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/30 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full sm:max-w-2xl rounded-lg bg-white shadow-xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selected.title}
                </h3>
                <p className="text-sm text-gray-600">
                  ISBN: {selected.isbn || "—"}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-4">
              <div>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <dt className="text-gray-500">Category</dt>
                    <dd className="text-gray-900">
                      {selected.category_name || selected.category_id || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Publication Year</dt>
                    <dd className="text-gray-900">
                      {selected.publication_year || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Publisher</dt>
                    <dd className="text-gray-900">
                      {selected.publisher || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Language</dt>
                    <dd className="text-gray-900">
                      {selected.language || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Shelf</dt>
                    <dd className="text-gray-900">
                      {selected.location_shelf || "—"}
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800">
                  Availability
                </h4>
                <div className="mt-1 text-sm text-gray-700">
                  {selectedAvailability ? (
                    <ul className="space-y-1">
                      <li>
                        Available: {selectedAvailability.available_copies}
                      </li>
                      <li>Reserved: {selectedAvailability.reserved_copies}</li>
                      <li>Total: {selectedAvailability.total_copies}</li>
                    </ul>
                  ) : (
                    <span className="text-gray-500">Not available</span>
                  )}
                </div>
                <h4 className="mt-4 text-sm font-semibold text-gray-800">
                  Authors
                </h4>
                <ul className="mt-1 text-sm text-gray-700 list-disc list-inside">
                  {selectedAuthors.length > 0 ? (
                    selectedAuthors.map((a) => (
                      <li key={a.author_id}>
                        {a.first_name} {a.last_name}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 list-none">Unknown</li>
                  )}
                </ul>
              </div>
              <div className="sm:col-span-2">
                <h4 className="text-sm font-semibold text-gray-800">
                  Description
                </h4>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                  {selected.description || "—"}
                </p>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => borrow(selected.book_id)}
                disabled={
                  (selectedAvailability?.available_copies ??
                    selected?.available_copies ??
                    0) <= 0
                }
                className={classNames(
                  "ml-2 rounded-md px-4 py-2 text-sm",
                  (selectedAvailability?.available_copies ??
                    selected?.available_copies ??
                    0) > 0
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                )}
              >
                Borrow
              </button>
              {me &&
                myLoans.some(
                  (ln) =>
                    ln.book_id === selected.book_id && ln.status === "ISSUED"
                ) && (
                  <button
                    onClick={async () => {
                      const token = AuthStore.getToken();
                      const owned = myLoans.find(
                        (ln) =>
                          ln.book_id === selected.book_id &&
                          ln.status === "ISSUED"
                      );
                      try {
                        await LoansAPI.returnLoan(owned.loan_id, token);
                        setToast({ type: "success", msg: "Book returned." });
                        // refresh availability, myLoans, and list
                        try {
                          const avail = await CatalogAPI.getAvailability(
                            selected.book_id
                          );
                          setSelectedAvailability(avail);
                        } catch {}
                        try {
                          const loans = await LoansAPI.listForUser(
                            me.user_id,
                            { status: "ISSUED" },
                            token
                          );
                          setMyLoans(Array.isArray(loans) ? loans : []);
                        } catch {}
                        try {
                          const list = await CatalogAPI.searchBooks({
                            ...filters,
                          });
                          setBooks(list || []);
                        } catch {}
                      } catch (e) {
                        setToast({
                          type: "error",
                          msg: e?.message || "Return failed",
                        });
                      }
                    }}
                    className="ml-2 rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
                  >
                    Return
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div
          className={classNames(
            "fixed bottom-4 right-4 z-30 rounded-md px-4 py-2 shadow",
            toast.type === "success" && "bg-green-600 text-white",
            toast.type === "error" && "bg-red-600 text-white",
            toast.type === "warn" && "bg-yellow-400 text-black"
          )}
          role="status"
        >
          {toast.msg}
        </div>
      )}
    </section>
  );
};

export default Catalog;
