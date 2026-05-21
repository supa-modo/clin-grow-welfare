import type { ReactNode } from "react";
import AuthLeftPanel from "@/components/ui/AuthLeftPanel";

export const AUTH_CARD_CLASS = "lg:bg-white lg:rounded-4xl lg:shadow-lg";

type AuthPageShellProps = {
  heading: ReactNode;
  sub: string;
  highlights: string[];
  children: ReactNode;
  cardClassName?: string;
  contentMaxWidth?: string;
};

export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div className="mx-1 mt-1 flex items-center gap-2 rounded-lg lg:rounded-xl border border-red-200 bg-red-50 px-3 py-1 lg:py-2 text-[0.7rem] md:text-[0.75rem] lg:text-[0.8rem] text-red-600 lg:mx-3">
      <svg
        className="h-4 w-4 shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </div>
  );
}

export function AuthLogoHeader() {
  return (
    <div className="mb-2 flex items-center justify-center gap-2.5">
      <img
        src="/logo.png"
        alt="Clin-Grow Welfare Group logo"
        className="h-auto w-28"
      />
    </div>
  );
}

export function AuthPageShell({
  heading,
  sub,
  highlights,
  children,
  cardClassName = "px-6 py-6 md:py-7 lg:px-7 lg:pb-8 lg:pt-6",
  contentMaxWidth = "max-w-lg",
}: AuthPageShellProps) {
  return (
    <>
      <style>{`
        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-animate { animation: authFadeUp 0.35s cubic-bezier(0.4,0,0.2,1) both; }
      `}</style>
      <div className="relative flex min-h-dvh flex-col bg-brand-50 lg:h-dvh lg:max-h-dvh lg:overflow-hidden lg:flex-row">
        <AuthLeftPanel heading={heading} sub={sub} highlights={highlights} />

        <div className="relative z-10 -mx-2 flex min-h-dvh flex-1 flex-col overflow-hidden lg:mx-0 lg:h-full lg:min-h-0 lg:w-1/2 lg:shrink-0">
          <div
            className="pointer-events-none absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat opacity-[0.32]"
            style={{ backgroundImage: 'url("/welfare.jpg")' }}
            aria-hidden
          />
          {/* <div
            className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/93 via-white/90 to-brand-50/92"
            aria-hidden
          /> */}
          <div
            className="pointer-events-none absolute inset-0 bg-white/80"
            aria-hidden
          />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-2 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] md:px-3 lg:px-6 lg:py-10">
            <div className={`w-full ${contentMaxWidth} auth-animate`}>
              <div className={`${AUTH_CARD_CLASS} ${cardClassName}`}>
                {children}
              </div>
              <p className="mt-6 text-center text-[0.65rem] leading-relaxed text-gray-400 md:text-xs lg:text-[0.8rem]">
                © {new Date().getFullYear()} Clin-Grow Welfare Group.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
