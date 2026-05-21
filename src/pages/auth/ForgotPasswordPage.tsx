import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FiCheckCircle } from "react-icons/fi";
import { MdLockReset } from "react-icons/md";
import { TbChevronLeft, TbMailFilled } from "react-icons/tb";

import { api } from "@/services/api";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  AuthErrorBanner,
  AuthLogoHeader,
  AuthPageShell,
} from "@/components/auth/AuthPageShell";
import { forgotAuthHighlights } from "@/components/auth/authHighlights";

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim()) {
      setError("Email or phone is required");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", { identifier: identifier.trim() });
    } catch {
      // Always show success to avoid revealing whether an account exists.
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <AuthPageShell
      heading="Account recovery"
      sub="Request a secure link to reset your password and restore access."
      highlights={forgotAuthHighlights}
    >
      <AuthLogoHeader />

      {submitted ? (
        <div className="py-4 text-center">
          <div className="mb-3 flex items-center justify-center gap-3">
            <FiCheckCircle className="h-8 w-8 text-brand-700" />
            <h2 className="font-google text-base font-extrabold text-brand-700 md:text-[1.1rem]">
              Check your inbox
            </h2>
          </div>
          <p className="mx-auto mb-6 max-w-sm text-xs leading-6 text-gray-500 md:text-[0.8rem] lg:text-[0.85rem]">
            If <span className="font-semibold">{identifier}</span> is registered, reset instructions have been sent.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 underline-offset-4 transition-colors hover:text-brand-600 hover:underline lg:text-sm"
          >
            <TbChevronLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
      ) : (
        <>
          <div className="pb-1 text-center">
            <h2 className="mb-1 font-google text-base font-extrabold text-brand-700 md:text-[1.1rem]">
              Forgot your password?
            </h2>
            <p className="text-xs text-slate-500 md:text-[0.8rem] lg:text-[0.85rem]">
              Enter your email or phone and we will send you reset instructions.
            </p>
          </div>

          {error ? <AuthErrorBanner message={error} /> : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2" noValidate>
            <div className="flex flex-col gap-4 px-1 lg:px-4">
              <Input
                label="Email or phone"
                labelClassName="text-gray-600"
                type="text"
                inputMode="email"
                leftIcon={<TbMailFilled className="h-5 w-5" />}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="your-email@example.com or 07..."
                required
              />
            </div>

            <Button
              variant="primary"
              rounded="full"
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="w-full bg-brand-700 py-[0.6rem] hover:bg-brand-600 md:py-2.5 lg:py-3"
              loadingText="Sending..."
            >
              <div className="font-google flex items-center justify-center gap-2 text-[0.7rem] md:text-[0.78rem] lg:text-[0.82rem]">
                <MdLockReset className="h-[1.1rem] w-[1.1rem] lg:h-5 lg:w-5" />
                <span>Send reset link</span>
              </div>
            </Button>

            <p className="pt-3 text-center text-xs text-ink-500 md:text-[0.8rem] lg:pt-4 lg:text-[0.85rem]">
              Remembered Your Password?{" "}
              <Link
                to="/login"
                className="text-xs font-semibold text-brand-700 underline underline-offset-4 hover:text-red-600 lg:text-sm"
              >
                Sign in
              </Link>
            </p>
          </form>
        </>
      )}
    </AuthPageShell>
  );
}
