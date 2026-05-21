import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FiCheckCircle } from "react-icons/fi";
import { MdLockReset } from "react-icons/md";
import { PiPasswordDuotone } from "react-icons/pi";
import { TbChevronLeft } from "react-icons/tb";

import { api } from "@/services/api";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  AuthErrorBanner,
  AuthLogoHeader,
  AuthPageShell,
} from "@/components/auth/AuthPageShell";
import { resetAuthHighlights } from "@/components/auth/authHighlights";

function apiErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: string; error?: string } } }
    ).response;
    return response?.data?.message ?? response?.data?.error ?? "Reset failed. The link may have expired.";
  }
  return "Reset failed. The link may have expired.";
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthPageShell
        heading="Reset link expired"
        sub="Request a fresh password reset link to continue safely."
        highlights={resetAuthHighlights}
      >
        <AuthLogoHeader />
        <div className="py-4 text-center">
          <h2 className="mb-2 font-google text-base font-extrabold text-brand-700 md:text-[1.1rem]">
            Invalid reset link
          </h2>
          <p className="mx-auto mb-6 max-w-sm text-xs leading-6 text-gray-500 md:text-[0.8rem] lg:text-[0.85rem]">
            This link may be invalid or expired. Request a new one and try again.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600 lg:text-sm"
          >
            <MdLockReset className="h-4 w-4" /> Request a new link
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      heading="Set a new password"
      sub="Create a strong password that helps keep your account secure."
      highlights={resetAuthHighlights}
    >
      <AuthLogoHeader />

      {success ? (
        <div className="py-4 text-center">
          <div className="mb-3 flex items-center justify-center gap-3">
            <FiCheckCircle className="h-8 w-8 text-brand-700" />
            <h2 className="font-google text-base font-extrabold text-brand-700 md:text-[1.1rem]">
              Password reset
            </h2>
          </div>
          <p className="mx-auto mb-6 max-w-sm text-xs leading-6 text-gray-500 md:text-[0.8rem] lg:text-[0.85rem]">
            Your password has been updated. Redirecting you to the login page...
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 underline-offset-4 transition-colors hover:text-brand-600 hover:underline lg:text-sm"
          >
            <TbChevronLeft className="h-4 w-4" /> Go to login now
          </Link>
        </div>
      ) : (
        <>
          <div className="pb-1 text-center">
            <h2 className="mb-1 font-google text-base font-extrabold text-brand-700 md:text-[1.1rem]">
              Reset your account password
            </h2>
            <p className="text-xs text-slate-500 md:text-[0.8rem] lg:text-[0.85rem]">
              Enter and confirm your new password below.
            </p>
          </div>

          {error ? <AuthErrorBanner message={error} /> : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2" noValidate>
            <div className="flex flex-col gap-4 px-1 lg:px-4">
              <Input
                label="New password"
                labelClassName="text-gray-600"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                leftIcon={<PiPasswordDuotone className="h-4 w-4 text-gray-600" />}
                rightIcon={showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                OnClickRightIcon={() => setShowPassword((value) => !value)}
                rightIconAriaLabel={showPassword ? "Hide password" : "Show password"}
                required
                className="font-bold text-gray-800 placeholder:font-normal"
              />
              <Input
                label="Confirm password"
                labelClassName="text-gray-600"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Repeat your new password"
                leftIcon={<PiPasswordDuotone className="h-4 w-4 text-gray-600" />}
                rightIcon={showConfirm ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                OnClickRightIcon={() => setShowConfirm((value) => !value)}
                rightIconAriaLabel={showConfirm ? "Hide password" : "Show password"}
                required
                className="font-bold text-gray-800 placeholder:font-normal"
              />
            </div>

            <Button
              variant="primary"
              rounded="full"
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="w-full bg-brand-700 py-[0.6rem] hover:bg-brand-600 md:py-2.5 lg:py-3"
              loadingText="Resetting..."
            >
              <div className="font-google flex items-center justify-center gap-2 text-[0.7rem] md:text-[0.78rem] lg:text-[0.82rem]">
                <MdLockReset className="h-[1.1rem] w-[1.1rem] lg:h-5 lg:w-5" />
                <span>Reset password</span>
              </div>
            </Button>
          </form>
        </>
      )}
    </AuthPageShell>
  );
}
