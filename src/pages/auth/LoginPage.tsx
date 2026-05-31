import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { TbMailFilled } from "react-icons/tb";
import { PiPasswordDuotone, PiSignInDuotone } from "react-icons/pi";

import { api } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import {
  AuthPageShell,
  AuthErrorBanner,
  AuthLogoHeader,
} from "@/components/auth/AuthPageShell";
import { defaultAuthHighlights } from "@/components/auth/authHighlights";
import { defaultRouteForUser, type AuthUser } from "@/lib/workspaces";

const rememberedIdentifier =
  localStorage.getItem("clingrow.rememberedIdentifier") ?? "";
const shouldRememberIdentifier =
  localStorage.getItem("clingrow.rememberIdentifier") === "true";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function apiErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: string; error?: string } } }
    ).response;
    return (
      response?.data?.message ??
      response?.data?.error ??
      "Login failed. Please try again or contact support"
    );
  }
  return "Login failed. Please try again or contact support";
}

export function LoginPage() {
  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberIdentifier, setRememberIdentifier] = useState(
    shouldRememberIdentifier,
  );
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: {
      identifier: shouldRememberIdentifier ? rememberedIdentifier : "",
      password: "",
    },
  });

  const submit = handleSubmit(async (values) => {
    setApiError("");
    try {
      const { data } = await api.post<{ token: string; user: AuthUser }>(
        "/auth/login",
        values,
      );
      const signedInUser = data.user;

      if (rememberIdentifier) {
        localStorage.setItem("clingrow.rememberIdentifier", "true");
        localStorage.setItem(
          "clingrow.rememberedIdentifier",
          values.identifier,
        );
      } else {
        localStorage.removeItem("clingrow.rememberIdentifier");
        localStorage.removeItem("clingrow.rememberedIdentifier");
      }

      localStorage.removeItem("clingrow.intendedWorkspace");
      setAuth(data.token, signedInUser);
      navigate(defaultRouteForUser(signedInUser), { replace: true });
    } catch (error) {
      setApiError(apiErrorMessage(error));
    }
  });

  return (
    <AuthPageShell
      heading="Clin-Grow Welfare Self-Service Portal"
      sub="Secure platform for member records, fund administration, and organizational oversight."
      highlights={defaultAuthHighlights}
    >
      <AuthLogoHeader />
      <div className="pb-1 text-center">
        <h2 className="text-base md:text-[1.1rem] font-extrabold font-google text-brand-700 mb-1">
          Member Self Service Portal.
        </h2>
        <p className="text-xs md:text-[0.8rem] lg:text-[0.85rem] ">
          Enter your login credentials to access your account
        </p>
      </div>

      {apiError ? <AuthErrorBanner message={apiError} /> : null}

      <form onSubmit={submit} className="pt-2 flex flex-col gap-2" noValidate>
        <div className="flex flex-col gap-4 px-1 lg:px-4">
          <Input
            label="Email or phone"
            labelClassName="text-gray-600"
            type="text"
            inputMode="email"
            leftIcon={<TbMailFilled className="w-5 h-5" />}
            placeholder="your-email@example.com or 07…"
            data-testid="login-identifier"
            error={errors.identifier?.message}
            autoComplete="username"
            autoFocus
            className="font-bold text-gray-800 placeholder:font-normal"
            {...register("identifier")}
          />

          <Input
            label="Account Password"
            labelClassName="text-gray-600"
            type={showPassword ? "text" : "password"}
            leftIcon={<PiPasswordDuotone className="w-4 h-4 text-gray-600" />}
            rightIcon={
              showPassword ? (
                <FaEyeSlash className="w-4 h-4" />
              ) : (
                <FaEye className="w-4 h-4" />
              )
            }
            OnClickRightIcon={() => setShowPassword((v) => !v)}
            rightIconAriaLabel={
              showPassword ? "Hide password" : "Show password"
            }
            placeholder="Enter your password"
            data-testid="login-password"
            error={errors.password?.message}
            autoComplete="current-password"
            className="font-bold text-gray-800 placeholder:font-normal"
            {...register("password")}
          />

          <div className="flex items-center justify-between gap-3 px-1 pb-1">
            <Checkbox
              checked={rememberIdentifier}
              onChange={setRememberIdentifier}
              label="Remember me"
              size="md"
            />
            <Link
              to="/forgot-password"
              className="text-[0.68rem] lg:text-[0.8rem] font-semibold text-brand-700 hover:text-brand-600 hover:underline underline-offset-4 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          variant="primary"
          rounded="full"
          type="submit"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="w-full py-[0.6rem] md:py-2.5 lg:py-3 bg-brand-700 hover:bg-brand-600"
          loadingText="Signing in…"
          data-testid="login-submit"
        >
          <div className="flex items-center font-google text-[0.7rem] md:text-[0.78rem] lg:text-[0.82rem] justify-center gap-2">
            <PiSignInDuotone className="w-[1.1rem] h-[1.1rem] lg:w-5 lg:h-5" />
            <span>Sign in to your account</span>
          </div>
        </Button>

        <p className="text-center text-xs md:text-[0.8rem] lg:text-[0.85rem] text-ink-500 pt-3 lg:pt-4">
          Are you a New member?{" "}
          <Link
            to="/register"
            className="text-xs lg:text-sm underline  font-semibold text-brand-700 underline-offset-4 hover:text-red-600 hover:underline"
          >
            Register Now
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
