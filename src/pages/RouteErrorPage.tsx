import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return (
      error.statusText ||
      error.data?.message ||
      `Request failed with status ${error.status}`
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something unexpected happened while loading this page.";
}

export function RouteErrorPage() {
  const error = useRouteError();

  return (
    <main className="min-h-screen bg-primary-50 px-6 py-10 text-ink-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl flex-col items-center justify-center text-center">
        <img
          src="/logo.png"
          alt="Clin-Grow Welfare Group logo"
          className="mb-6 h-24 w-24 object-contain"
        />
        <p className="text-sm lg:text-[0.95rem] font-extrabold text-primary-700">
          Clin-Grow Welfare Group
        </p>
        <h1 className="mt-3 text-base font-extrabold text-gray-500 lg:text-lg">
          This page could not be loaded or seems to have been moved !
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-ink-600">
          {getErrorMessage(error)}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/login"
            className="rounded-lg bg-primary-700 px-6 py-2 text-[0.8rem] lg:text-sm font-bold text-white shadow-sm transition hover:bg-primary-600"
          >
            Back to login
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-secondary-600/80 bg-white px-6 py-2 text-[0.8rem] lg:text-sm font-bold text-secondary-700 transition hover:bg-secondary-50"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
