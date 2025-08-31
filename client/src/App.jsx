import React from "react";

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 bg-clip-text text-transparent">
          LibroTrack
        </h1>
        <p className="mt-2 text-slate-600">React + Tailwind is live.</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              Tailwind Check
            </div>
            <h2 className="mt-3 text-lg font-semibold">Styled Card</h2>
            <p className="mt-1 text-sm text-slate-600">
              If you see rounded corners, borders, and shadow on hover, Tailwind utilities are working.
            </p>
            <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 active:scale-[.98] transition">
              Test Button
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Utilities Demo</h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-indigo-500" /> Gradient title</li>
              <li className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-amber-500" /> Hover + focus ring on button</li>
              <li className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" /> Responsive grid (resize window)</li>
              <li className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-rose-500" /> Animation below</li>
            </ul>
            <div className="mt-4 h-2 w-full animate-pulse rounded bg-slate-200" />
          </div>
        </div>

        <div className="mt-8 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 text-amber-800">
          If this banner is amber with a left border, Tailwind styles are being applied.
        </div>
        <p className="mt-2 hidden text-sm text-slate-500 sm:block">This line is hidden on small screens (responsive test).</p>
      </div>
    </div>
  );
}

export default App;
