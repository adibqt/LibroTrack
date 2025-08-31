import React from "react";

const Login = () => {
  return (
    <section className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
      <form className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-700">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Continue
        </button>
      </form>
    </section>
  );
};

export default Login;
