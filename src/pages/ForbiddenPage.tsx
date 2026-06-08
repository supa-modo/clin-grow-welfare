import { Link, useNavigate } from "react-router-dom";

export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-primary-50 px-6 py-10 text-ink-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl flex-col items-center justify-center text-center">
        <img
          src="/logo.webp"
          alt="Clin-Grow Welfare Group logo"
          className="mb-6 h-24 w-24 object-contain"
        />
        <p className="text-sm font-extrabold text-primary-700 lg:text-[0.95rem]">
          Clin-Grow Welfare Group
        </p>
        <h1 className="mt-3 text-base font-extrabold text-gray-500 lg:text-lg">
          You do not have access to this page.
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-ink-600">
          Your current role does not include this permission. If access was just
          updated, sign out and sign in again to refresh your session.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg bg-primary-700 px-6 py-2 text-[0.8rem] font-bold text-white shadow-sm transition hover:bg-primary-600 lg:text-sm"
          >
            Go back
          </button>
          <Link
            to="/login"
            className="rounded-lg border border-secondary-600/80 bg-white px-6 py-2 text-[0.8rem] font-bold text-secondary-700 transition hover:bg-secondary-50 lg:text-sm"
          >
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
