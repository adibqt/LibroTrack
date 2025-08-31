import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
      <p className="text-sm font-medium text-blue-600">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
        Page not found
      </h1>
      <p className="mt-2 text-gray-600">
        Sorry, we couldn’t find the page you’re looking for.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Back to homepage
        </Link>
      </div>
    </section>
  );
};

export default NotFound;
